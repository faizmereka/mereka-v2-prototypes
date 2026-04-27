# Job Offer, Accept Offer & Contract Details - Implementation Plan v2

## Overview

This document outlines the **production-grade** implementation plan for the Job Offer, Accept Offer, and Contract Details features in Mereka v2. The implementation follows industry best practices including event-driven architecture, proper error handling, idempotency, and comprehensive logging.

**Key Differences from V1:**
- Single **Stripe Atlas** account (no MYR/International split)
- **NO platform commission** - Mereka revenue is subscription-based only
- **Stripe fee (2.9% + $0.30)** passed to client - expert receives full amount
- **Event-driven** architecture with domain events
- **Idempotent** payment operations
- **Transaction support** for critical operations
- Proper **error hierarchy** with typed errors
- **Browser testing** with agent-browser CLI for E2E validation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Models](#2-data-models)
3. [Service Layer Design](#3-service-layer-design)
4. [API Endpoints](#4-api-endpoints)
5. [Payment Processing](#5-payment-processing)
6. [Cron Jobs](#6-cron-jobs)
7. [Event System](#7-event-system)
8. [Error Handling](#8-error-handling)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)
11. [File Structure](#11-file-structure)
12. [Browser Testing with agent-browser](#12-browser-testing-with-agent-browser)
13. [Success Criteria](#13-success-criteria)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Routes    │  │ Controllers │  │   Schemas   │  │ Middleware  │    │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └─────────────┘    │
└─────────┼────────────────┼──────────────────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Service Layer                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ ContractOffer   │  │ MilestoneAction │  │ TimelogService  │         │
│  │    Service      │  │    Service      │  │                 │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
│           └────────────────────┼────────────────────┘                   │
│                                ▼                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ PaymentService  │  │  EventEmitter   │  │ PendingPayment  │         │
│  │   (Stripe)      │  │                 │  │    Service      │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
          │                      │                    │
          ▼                      ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Data Layer                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Contract   │  │  Milestone  │  │ Timelog     │  │ Transaction │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         External Services                                │
│  ┌─────────────────┐  ┌─────────────────┐                              │
│  │  Stripe Atlas   │  │ Firebase Storage│                              │
│  │   (Single)      │  │                 │                              │
│  └─────────────────┘  └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Single Responsibility** | Each service handles one domain |
| **Event-Driven** | Domain events for cross-cutting concerns |
| **Idempotency** | Idempotency keys for payment operations |
| **Fail-Safe** | Graceful degradation, circuit breakers |
| **Audit Trail** | All state changes logged |
| **Testability** | Dependency injection, interfaces |

### 1.3 Stripe Configuration (Atlas Only)

```typescript
// src/core/config/stripe.config.ts
export const stripeConfig = {
  secretKey: env.STRIPE_SECRET_KEY,        // Atlas secret key
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  currency: 'USD',

  // NO platform fee - Mereka revenue is subscription-based only
  platformFeeRate: 0,

  // Stripe Atlas fee: 2.9% + $0.30 (USD) - passed to client
  stripeFee: {
    percentage: 0.029,
    fixed: 0.30
  }
};
```

---

## 2. Data Models

### 2.1 Contract Model (Enhanced)

**File**: `src/core/models/Contract.ts`

```typescript
interface IContract extends Document {
  // Core References
  jobId: ObjectId;
  jobProposalId: ObjectId;  // Unique constraint
  clientHubId: ObjectId;
  expertHubId?: ObjectId;

  // Contract Details
  contractTitle: string;           // max 70 chars
  contractDescription: string;     // max 5,000 chars
  contractUploads: string[];

  // Pricing
  priceType: PriceType;           // 'fixed' | 'hourly'
  proposedPrice?: number;          // Fixed price total
  hourlyProposedPrice?: number;    // Hourly rate
  weeklyLimit?: number;            // Max 168 hours
  hasMilestones: boolean;
  selectedCurrency: string;        // Always 'USD' for Atlas

  // Timeline
  startDate?: Date;
  endDate?: Date;

  // Status
  status: ContractStatus;
  statusHistory: IStatusChange[];  // NEW: Track all status changes

  // Parties
  asssignedExpertId: ObjectId;
  createdBy: ObjectId;

  // Stripe (Atlas Only)
  stripeCustomerId: string;
  paymentMethodId?: string;

  // Terms Update (Hourly)
  pendingTermsUpdate?: IPendingTermsUpdate;

  // Acceptance
  acceptMessage?: string;
  acceptedAt?: Date;
  declineReason?: string;
  declinedAt?: Date;

  // Metadata
  version: number;                 // NEW: Optimistic locking
  createdAt: Date;
  updatedAt: Date;
}

interface IStatusChange {
  from: ContractStatus;
  to: ContractStatus;
  changedBy: ObjectId;
  changedAt: Date;
  reason?: string;
}

enum ContractStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

enum PriceType {
  FIXED = 'fixed',
  HOURLY = 'hourly'
}
```

### 2.2 Milestone Model (Enhanced)

**File**: `src/core/models/Milestone.ts`

```typescript
interface IMilestone extends Document {
  // References
  jobId: ObjectId;
  jobProposalId: ObjectId;
  contractId: ObjectId;

  // Details
  taskName: string;              // max 150 chars
  taskDescription?: string;      // max 500 chars
  amount: number;
  currency: string;              // 'USD'
  dueDate: Date;
  order: number;                 // NEW: Milestone order

  // Status
  status: MilestoneStatus;
  statusHistory: IStatusChange[];

  // Work Submission
  workLogDescription?: string;
  workLogFilesUrl: string[];
  workSubmittedAt?: Date;

  // Approval
  approvedAt?: Date;
  approvedBy?: ObjectId;
  revisionNotes?: string;
  revisionCount: number;         // NEW: Track revisions

  // Payment
  paymentId?: ObjectId;          // Reference to ContractPayment
  fundedAt?: Date;
  releasedAt?: Date;
  releasedBy?: ObjectId;
  autoReleased: boolean;

  // Audit
  createdBy: ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

enum MilestoneStatus {
  PENDING = 'pending',           // Not funded
  FUNDED = 'funded',             // Payment in escrow
  WORK_SUBMITTED = 'work_submitted',
  REVISION_REQUESTED = 'revision_requested',
  APPROVED = 'approved',
  RELEASED = 'released',         // Payment released
  COMPLETED = 'completed',       // Transfer complete
  CANCELLED = 'cancelled'
}
```

### 2.3 ContractPayment Model (Enhanced)

**File**: `src/core/models/ContractPayment.ts`

```typescript
interface IContractPayment extends Document {
  // Idempotency
  idempotencyKey: string;        // NEW: Prevent duplicate payments

  // Type
  paymentType: PaymentType;      // 'milestone' | 'timelog'

  // References
  contractId: ObjectId;
  jobId: ObjectId;
  clientHubId: ObjectId;
  expertHubId?: ObjectId;
  clientId: ObjectId;
  expertId: ObjectId;

  // For Milestone
  milestoneId?: ObjectId;

  // For Timelog
  timelogEntryIds?: ObjectId[];
  weekNumber?: number;
  year?: number;
  weekStartDate?: Date;
  weekEndDate?: Date;
  hoursWorked?: number;
  hourlyRate?: number;

  // Amount
  amount: number;                // Base amount (what expert receives)
  currency: string;              // 'USD'

  // Fees (Calculated) - NO platform fee, only Stripe fee
  stripeFee: number;             // 2.9% + $0.30 (passed to client)
  grossAmount: number;           // amount + stripeFee (what client pays)
  // Expert receives full amount - no platform commission

  // Status
  status: PaymentStatus;
  escrowStatus: EscrowStatus;

  // Stripe
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeTransferId?: string;
  stripeRefundId?: string;
  stripeResponse?: Record<string, unknown>;

  // Transfer
  transferStatus: TransferStatus;
  transferredAt?: Date;

  // Refund
  refundedAmount?: number;
  refundedAt?: Date;
  refundedBy?: ObjectId;
  refundReason?: string;

  // Dates
  fundedAt?: Date;
  releasedAt?: Date;
  releasedBy?: ObjectId;

  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

enum PaymentStatus {
  PENDING = 'pending',
  FUNDED = 'funded',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

enum EscrowStatus {
  NONE = 'none',
  REQUIRES_CAPTURE = 'requires_capture',
  CAPTURED = 'captured',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

enum TransferStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

### 2.4 TimelogEntry Model (Enhanced)

**File**: `src/core/models/TimelogEntry.ts`

```typescript
interface ITimelogEntry extends Document {
  // References
  contractId: ObjectId;
  jobId: ObjectId;
  expertId: ObjectId;
  clientId: ObjectId;
  clientHubId: ObjectId;
  expertHubId?: ObjectId;

  // Date/Time
  workDate: Date;
  weekNumber: number;
  year: number;
  monthNumber: number;

  // Time Tracking
  startTime: string;             // "HH:MM" 24-hour
  endTime: string;
  breakMinutes: number;          // NEW: In minutes for precision
  totalMinutes: number;          // NEW: Calculated
  hoursWorked: number;           // totalMinutes / 60

  // Work Details
  description: string;           // min 10, max 1,000
  tasks: string[];               // max 20

  // Rate at time of work
  hourlyRate: number;
  weeklyLimit: number;
  currency: string;              // 'USD'

  // Calculated
  billableAmount: number;        // hoursWorked * hourlyRate

  // Status
  status: TimelogStatus;
  statusHistory: IStatusChange[];

  // Approval
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: ObjectId;
  rejectedAt?: Date;
  rejectedBy?: ObjectId;
  rejectionReason?: string;

  // Payment
  paymentId?: ObjectId;
  paidAt?: Date;

  // Audit
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

enum TimelogStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid'
}
```

### 2.5 PendingPayment Model

**File**: `src/core/models/PendingPayment.ts`

For retry logic on failed hourly payments.

```typescript
interface IPendingPayment extends Document {
  // Idempotency
  idempotencyKey: string;

  // References
  contractId: ObjectId;
  jobId: ObjectId;
  expertId: ObjectId;
  clientId: ObjectId;
  clientHubId: ObjectId;
  expertHubId?: ObjectId;

  // Payment Details
  amount: number;                // In cents
  grossAmount: number;           // Including fees
  currency: string;
  paymentMethodId: string;
  stripeCustomerId: string;

  // Timelog Context
  timelogIds: ObjectId[];
  totalHours: number;
  weekNumber: number;
  year: number;
  weekStartDate: Date;
  weekEndDate: Date;

  // Retry Tracking
  status: PendingPaymentStatus;
  retryCount: number;
  maxRetries: number;            // Default: 5
  nextRetryAt: Date;
  retryHistory: IRetryAttempt[];

  // Resolution
  processedAt?: Date;
  paymentId?: ObjectId;          // Created ContractPayment
  failedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

interface IRetryAttempt {
  attemptNumber: number;
  attemptedAt: Date;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  stripeError?: Record<string, unknown>;
}

enum PendingPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

**Note:** Audit logging uses the existing `Transaction` model for financial audit trail.

---

## 3. Service Layer Design

### 3.1 Base Service Pattern

```typescript
// src/core/services/base/BaseService.ts
abstract class BaseService<T extends Document> {
  protected model: Model<T>;
  protected eventEmitter: EventEmitter;
  protected logger: Logger;
  protected auditService: AuditService;

  constructor(
    model: Model<T>,
    eventEmitter: EventEmitter,
    logger: Logger,
    auditService: AuditService
  ) {
    this.model = model;
    this.eventEmitter = eventEmitter;
    this.logger = logger;
    this.auditService = auditService;
  }

  // Emit domain event
  protected emit(event: string, payload: unknown): void {
    this.eventEmitter.emit(event, payload);
    this.logger.debug({ event, payload }, 'Domain event emitted');
  }

  // Create audit log
  protected async audit(
    action: AuditAction,
    entityId: ObjectId,
    actorId: ObjectId | null,
    changes?: IFieldChange[]
  ): Promise<void> {
    await this.auditService.log({
      action,
      entityType: this.model.modelName,
      entityId,
      actorId,
      actorType: actorId ? 'user' : 'system',
      changes
    });
  }

  // Transaction wrapper
  protected async withTransaction<R>(
    fn: (session: ClientSession) => Promise<R>
  ): Promise<R> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
```

### 3.2 Contract Offer Service

**File**: `src/core/services/hub/contracts/hubContractOffer.service.ts`

```typescript
export class HubContractOfferService extends BaseService<IContract> {
  constructor(
    private readonly milestoneService: MilestoneService,
    private readonly paymentService: ContractPaymentService,
    private readonly emailLogService: EmailLogService,
    eventEmitter: EventEmitter,
    logger: Logger,
    auditService: AuditService
  ) {
    super(Contract, eventEmitter, logger, auditService);
  }

  /**
   * Send contract offer to expert
   */
  async sendOffer(input: SendOfferInput, actorId: ObjectId): Promise<SendOfferResult> {
    return this.withTransaction(async (session) => {
      // 1. Validate proposal
      const proposal = await this.validateProposal(input.jobProposalId);

      // 2. Validate job
      const job = await this.validateJob(input.jobId, actorId);

      // 3. Create contract
      const contract = await Contract.create([{
        ...input,
        status: ContractStatus.PENDING,
        statusHistory: [{
          from: null,
          to: ContractStatus.PENDING,
          changedBy: actorId,
          changedAt: new Date()
        }],
        version: 1,
        selectedCurrency: 'USD'  // Always USD for Atlas
      }], { session });

      // 4. Create milestones if fixed price with milestones
      let milestones: IMilestone[] = [];
      if (input.priceType === 'fixed' && input.milestones?.length) {
        milestones = await this.milestoneService.createBulk(
          input.milestones.map((m, i) => ({
            ...m,
            contractId: contract[0]._id,
            jobId: input.jobId,
            jobProposalId: input.jobProposalId,
            order: i + 1,
            status: MilestoneStatus.PENDING,
            currency: 'USD',
            createdBy: actorId
          })),
          session
        );
      }

      // 5. Fund first milestone if requested
      let payment: IContractPayment | null = null;
      if (input.fundFirstMilestone && milestones.length > 0) {
        payment = await this.paymentService.fundMilestone({
          milestoneId: milestones[0]._id,
          paymentMethodId: input.paymentMethodId,
          idempotencyKey: `offer-${contract[0]._id}-m1`
        }, actorId, session);
      }

      // 6. Audit
      await this.audit(AuditAction.CREATE, contract[0]._id, actorId);

      // 7. Emit event (handled outside transaction)
      this.emit('contract.offer.sent', {
        contractId: contract[0]._id,
        expertId: proposal.asssignedExpertId,
        clientId: actorId
      });

      return {
        contract: contract[0],
        milestones,
        payment
      };
    });
  }

  /**
   * Accept contract offer
   */
  async acceptOffer(
    contractId: ObjectId,
    input: AcceptOfferInput,
    actorId: ObjectId
  ): Promise<IContract> {
    return this.withTransaction(async (session) => {
      // 1. Get and validate contract
      const contract = await this.getAndLock(contractId, session);

      if (contract.status !== ContractStatus.PENDING) {
        throw new ContractError('INVALID_STATUS', 'Contract is not pending');
      }

      if (!contract.asssignedExpertId.equals(actorId)) {
        throw new ContractError('UNAUTHORIZED', 'Only assigned expert can accept');
      }

      // 2. Validate expert has payout setup
      await this.validatePayoutSetup(actorId);

      // 3. Update contract
      const updatedContract = await Contract.findByIdAndUpdate(
        contractId,
        {
          status: ContractStatus.ACTIVE,
          acceptMessage: input.acceptMessage,
          acceptedAt: new Date(),
          $push: {
            statusHistory: {
              from: ContractStatus.PENDING,
              to: ContractStatus.ACTIVE,
              changedBy: actorId,
              changedAt: new Date()
            }
          },
          $inc: { version: 1 }
        },
        { new: true, session }
      );

      // 4. Update job status
      await Job.findByIdAndUpdate(
        contract.jobId,
        { status: 'IN_PROGRESS' },
        { session }
      );

      // 5. Update proposal status
      await JobProposal.findByIdAndUpdate(
        contract.jobProposalId,
        { status: 'accepted', contractId: contract._id },
        { session }
      );

      // 6. Audit
      await this.audit(AuditAction.STATUS_CHANGE, contractId, actorId, [{
        field: 'status',
        oldValue: ContractStatus.PENDING,
        newValue: ContractStatus.ACTIVE
      }]);

      // 7. Emit event
      this.emit('contract.offer.accepted', {
        contractId,
        expertId: actorId,
        clientId: contract.createdBy
      });

      return updatedContract;
    });
  }

  /**
   * Decline contract offer
   */
  async declineOffer(
    contractId: ObjectId,
    input: DeclineOfferInput,
    actorId: ObjectId
  ): Promise<IContract> {
    return this.withTransaction(async (session) => {
      const contract = await this.getAndLock(contractId, session);

      if (contract.status !== ContractStatus.PENDING) {
        throw new ContractError('INVALID_STATUS', 'Contract is not pending');
      }

      // 1. Refund any funded milestone
      await this.refundFundedMilestones(contractId, actorId, session);

      // 2. Update contract
      const updatedContract = await Contract.findByIdAndUpdate(
        contractId,
        {
          status: ContractStatus.CANCELLED,
          declineReason: input.declineReason,
          declinedAt: new Date(),
          $push: {
            statusHistory: {
              from: ContractStatus.PENDING,
              to: ContractStatus.CANCELLED,
              changedBy: actorId,
              changedAt: new Date(),
              reason: input.declineReason
            }
          },
          $inc: { version: 1 }
        },
        { new: true, session }
      );

      // 3. Update proposal
      await JobProposal.findByIdAndUpdate(
        contract.jobProposalId,
        { status: 'rejected' },
        { session }
      );

      // 4. Audit & emit
      await this.audit(AuditAction.STATUS_CHANGE, contractId, actorId);
      this.emit('contract.offer.declined', { contractId, expertId: actorId });

      return updatedContract;
    });
  }

  // Optimistic locking helper
  private async getAndLock(id: ObjectId, session: ClientSession): Promise<IContract> {
    const contract = await Contract.findById(id).session(session);
    if (!contract) {
      throw new ContractError('NOT_FOUND', 'Contract not found');
    }
    return contract;
  }
}
```

### 3.3 Payment Service (Stripe Atlas)

**File**: `src/core/services/shared/payments/contractPayment.service.ts`

```typescript
export class ContractPaymentService extends BaseService<IContractPayment> {
  private stripe: Stripe;

  constructor(
    eventEmitter: EventEmitter,
    logger: Logger,
    auditService: AuditService
  ) {
    super(ContractPayment, eventEmitter, logger, auditService);
    this.stripe = new Stripe(stripeConfig.secretKey);
  }

  /**
   * Calculate fees for a payment
   * NO platform commission - expert receives full amount
   * Only Stripe fee (2.9% + $0.30) is passed to client
   */
  calculateFees(amount: number): PaymentFees {
    const stripeFee = (amount * stripeConfig.stripeFee.percentage) + stripeConfig.stripeFee.fixed;
    const grossAmount = amount + stripeFee;  // Client pays (amount + Stripe fee)

    return {
      amount: Math.round(amount * 100) / 100,           // Expert receives full amount
      stripeFee: Math.round(stripeFee * 100) / 100,     // Stripe processing fee
      grossAmount: Math.round(grossAmount * 100) / 100  // Total client pays
    };
  }

  /**
   * Fund a milestone (escrow)
   */
  async fundMilestone(
    input: FundMilestoneInput,
    actorId: ObjectId,
    session?: ClientSession
  ): Promise<IContractPayment> {
    // 1. Get milestone and contract
    const milestone = await Milestone.findById(input.milestoneId).session(session);
    if (!milestone) throw new PaymentError('MILESTONE_NOT_FOUND');

    const contract = await Contract.findById(milestone.contractId).session(session);
    if (!contract) throw new PaymentError('CONTRACT_NOT_FOUND');

    // 2. Calculate fees
    const fees = this.calculateFees(milestone.amount);

    // 3. Check idempotency
    const existing = await ContractPayment.findOne({
      idempotencyKey: input.idempotencyKey
    }).session(session);

    if (existing) {
      this.logger.info({ paymentId: existing._id }, 'Idempotent payment found');
      return existing;
    }

    // 4. Create Stripe PaymentIntent with manual capture (escrow)
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(fees.grossAmount * 100),  // In cents
      currency: 'usd',
      customer: contract.stripeCustomerId,
      payment_method: input.paymentMethodId,
      capture_method: 'manual',  // ESCROW: Don't capture immediately
      confirm: true,
      off_session: true,
      metadata: {
        contractId: contract._id.toString(),
        milestoneId: milestone._id.toString(),
        type: 'milestone'
      }
    }, {
      idempotencyKey: input.idempotencyKey
    });

    // 5. Create payment record
    const payment = await ContractPayment.create([{
      idempotencyKey: input.idempotencyKey,
      paymentType: 'milestone',
      contractId: contract._id,
      jobId: contract.jobId,
      clientHubId: contract.clientHubId,
      expertHubId: contract.expertHubId,
      clientId: contract.createdBy,
      expertId: contract.asssignedExpertId,
      milestoneId: milestone._id,
      ...fees,
      currency: 'USD',
      status: PaymentStatus.FUNDED,
      escrowStatus: EscrowStatus.REQUIRES_CAPTURE,
      transferStatus: TransferStatus.PENDING,
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: paymentIntent.latest_charge as string,
      stripeResponse: paymentIntent,
      fundedAt: new Date()
    }], { session });

    // 6. Update milestone
    await Milestone.findByIdAndUpdate(
      milestone._id,
      {
        status: MilestoneStatus.FUNDED,
        paymentId: payment[0]._id,
        fundedAt: new Date(),
        $push: {
          statusHistory: {
            from: MilestoneStatus.PENDING,
            to: MilestoneStatus.FUNDED,
            changedBy: actorId,
            changedAt: new Date()
          }
        }
      },
      { session }
    );

    // 7. Audit & emit
    await this.audit(AuditAction.PAYMENT_INITIATED, payment[0]._id, actorId);
    this.emit('milestone.funded', {
      milestoneId: milestone._id,
      paymentId: payment[0]._id,
      amount: fees.amount
    });

    return payment[0];
  }

  /**
   * Release milestone payment (capture escrow)
   */
  async releaseMilestonePayment(
    paymentId: ObjectId,
    actorId: ObjectId
  ): Promise<IContractPayment> {
    return this.withTransaction(async (session) => {
      const payment = await ContractPayment.findById(paymentId).session(session);
      if (!payment) throw new PaymentError('PAYMENT_NOT_FOUND');

      if (payment.status !== PaymentStatus.FUNDED) {
        throw new PaymentError('INVALID_STATUS', 'Payment is not in funded status');
      }

      // 1. Capture the PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.capture(
        payment.stripePaymentIntentId
      );

      // 2. Update payment
      const updated = await ContractPayment.findByIdAndUpdate(
        paymentId,
        {
          status: PaymentStatus.RELEASED,
          escrowStatus: EscrowStatus.CAPTURED,
          releasedAt: new Date(),
          releasedBy: actorId,
          stripeResponse: paymentIntent
        },
        { new: true, session }
      );

      // 3. Update milestone
      await Milestone.findByIdAndUpdate(
        payment.milestoneId,
        {
          status: MilestoneStatus.RELEASED,
          releasedAt: new Date(),
          releasedBy: actorId
        },
        { session }
      );

      // 4. Audit & emit
      await this.audit(AuditAction.PAYMENT_CAPTURED, paymentId, actorId);
      this.emit('payment.released', { paymentId, milestoneId: payment.milestoneId });

      return updated;
    });
  }

  /**
   * Transfer funds to expert's connected account
   * Expert receives FULL amount (no platform commission)
   */
  async transferToExpert(paymentId: ObjectId): Promise<IContractPayment> {
    const payment = await ContractPayment.findById(paymentId);
    if (!payment) throw new PaymentError('PAYMENT_NOT_FOUND');

    if (payment.status !== PaymentStatus.RELEASED) {
      throw new PaymentError('INVALID_STATUS', 'Payment not released');
    }

    // Get expert's connected account
    const hub = await Hub.findById(payment.expertHubId);
    if (!hub?.stripeConnectAccountId) {
      throw new PaymentError('NO_CONNECT_ACCOUNT', 'Expert has no Stripe account');
    }

    // Create transfer - expert receives FULL amount (no commission)
    const transfer = await this.stripe.transfers.create({
      amount: Math.round(payment.amount * 100),  // Full amount, no deduction
      currency: 'usd',
      destination: hub.stripeConnectAccountId,
      source_transaction: payment.stripeChargeId,
      metadata: {
        paymentId: payment._id.toString(),
        contractId: payment.contractId.toString()
      }
    });

    // Update payment
    const updated = await ContractPayment.findByIdAndUpdate(
      paymentId,
      {
        stripeTransferId: transfer.id,
        transferStatus: TransferStatus.COMPLETED,
        transferredAt: new Date()
      },
      { new: true }
    );

    // Update milestone to completed
    if (payment.milestoneId) {
      await Milestone.findByIdAndUpdate(payment.milestoneId, {
        status: MilestoneStatus.COMPLETED
      });
    }

    // Emit
    this.emit('payment.transferred', { paymentId, transferId: transfer.id });

    return updated;
  }

  /**
   * Refund a payment
   */
  async refund(
    paymentId: ObjectId,
    reason: string,
    actorId: ObjectId
  ): Promise<IContractPayment> {
    const payment = await ContractPayment.findById(paymentId);
    if (!payment) throw new PaymentError('PAYMENT_NOT_FOUND');

    if (payment.transferStatus === TransferStatus.COMPLETED) {
      throw new PaymentError('ALREADY_TRANSFERRED', 'Cannot refund after transfer');
    }

    // Refund via Stripe
    const refund = await this.stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reason: 'requested_by_customer'
    });

    // Update payment
    const updated = await ContractPayment.findByIdAndUpdate(
      paymentId,
      {
        status: PaymentStatus.REFUNDED,
        stripeRefundId: refund.id,
        refundedAmount: payment.grossAmount,
        refundedAt: new Date(),
        refundedBy: actorId,
        refundReason: reason
      },
      { new: true }
    );

    // Update milestone if applicable
    if (payment.milestoneId) {
      await Milestone.findByIdAndUpdate(payment.milestoneId, {
        status: MilestoneStatus.PENDING,
        paymentId: null,
        fundedAt: null
      });
    }

    this.emit('payment.refunded', { paymentId, amount: payment.grossAmount });

    return updated;
  }
}
```

**Note:** Email notifications will be handled separately - not part of this implementation scope.

---

## 4. API Endpoints

### 4.1 Contract Offer Routes

**File**: `src/modules/hub/routes/contracts/hubContractOffer.routes.ts`

```typescript
export async function hubContractOfferRoutes(fastify: FastifyInstance) {
  // Send offer
  fastify.post('/', {
    schema: sendOfferSchema,
    preHandler: [fastify.authenticate, fastify.requireHubMember],
    handler: sendOffer
  });

  // Get offer details
  fastify.get('/:contractId/offer', {
    schema: getOfferSchema,
    preHandler: [fastify.authenticate],
    handler: getOffer
  });

  // Accept offer
  fastify.post('/:contractId/accept', {
    schema: acceptOfferSchema,
    preHandler: [fastify.authenticate, fastify.requireExpert],
    handler: acceptOffer
  });

  // Decline offer
  fastify.post('/:contractId/decline', {
    schema: declineOfferSchema,
    preHandler: [fastify.authenticate, fastify.requireExpert],
    handler: declineOffer
  });

  // Request changes
  fastify.post('/:contractId/request-changes', {
    schema: requestChangesSchema,
    preHandler: [fastify.authenticate, fastify.requireExpert],
    handler: requestChanges
  });
}
```

### 4.2 API Response Standards

```typescript
// Success response
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    requestId: string;
    timestamp: string;
  };
}

// Error response
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
    timestamp: string;
  };
}

// Pagination meta
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

---

## 5. Payment Processing

### 5.1 Stripe Atlas Configuration

```typescript
// src/core/config/stripe.config.ts
export const stripeConfig = {
  secretKey: env.STRIPE_SECRET_KEY,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,

  // Single Atlas account - USD only
  currency: 'USD',

  // NO platform fee - Mereka revenue is subscription-based
  platformFeeRate: 0,

  // Stripe fee: 2.9% + $0.30 (Atlas/US rates) - passed to client
  stripeFee: {
    percentage: 0.029,
    fixed: 0.30
  },

  // Retry settings
  maxRetries: 5,
  retryDelay: 24 * 60 * 60 * 1000  // 24 hours
};
```

### 5.2 Fee Calculation

```typescript
/**
 * Calculate fees for a payment
 *
 * Mereka Business Model: NO platform commission
 * Revenue comes from monthly Hub subscriptions only
 *
 * Example for $100 milestone:
 * - Amount: $100.00 (milestone value = what expert receives)
 * - Stripe Fee: $3.20 (2.9% + $0.30) - passed to client
 * - Gross Amount: $103.20 (what client pays)
 * - Expert receives: $100.00 (full amount, no commission)
 */
function calculateFees(amount: number): PaymentFees {
  const stripeFee = (amount * 0.029) + 0.30;
  const grossAmount = amount + stripeFee;  // Client pays this

  return {
    amount: round(amount),           // Expert receives full amount
    stripeFee: round(stripeFee),     // Processing fee passed to client
    grossAmount: round(grossAmount)  // Total client pays
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
```

### 5.3 Payment Flow Diagrams

#### Fixed Price (Milestone) Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Stripe    │     │   Expert    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Fund Milestone │                   │
       ├──────────────────►│                   │
       │                   │                   │
       │ PaymentIntent     │                   │
       │ (manual capture)  │                   │
       │◄──────────────────┤                   │
       │                   │                   │
       │     ═══════════════════════════       │
       │     ║ ESCROW: Funds Authorized ║      │
       │     ═══════════════════════════       │
       │                   │                   │
       │                   │  2. Submit Work   │
       │                   │◄──────────────────┤
       │                   │                   │
       │ 3. Approve Work   │                   │
       ├──────────────────►│                   │
       │                   │                   │
       │  Capture Payment  │                   │
       │──────────────────►│                   │
       │                   │                   │
       │     ═══════════════════════════       │
       │     ║ CAPTURED: Funds Secured  ║      │
       │     ═══════════════════════════       │
       │                   │                   │
       │                   │  4. Transfer      │
       │                   ├──────────────────►│
       │                   │                   │
       │                   │   FULL Amount     │
       │                   │   (no commission) │
       │                   │                   │
```

#### Hourly Contract Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Expert    │     │   System    │     │   Client    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Log Hours      │                   │
       ├──────────────────►│                   │
       │  (Mon-Sun)        │                   │
       │                   │                   │
       │ 2. Submit Timelogs│                   │
       ├──────────────────►│                   │
       │                   │                   │
       │                   │ 3. Notify Client  │
       │                   ├──────────────────►│
       │                   │                   │
       │                   │ 4. Approve        │
       │                   │◄──────────────────┤
       │                   │                   │
       │     ════════════════════════════      │
       │     ║ Monday 23:59 UTC Cron Job ║     │
       │     ════════════════════════════      │
       │                   │                   │
       │                   │ 5. Charge Client  │
       │                   ├──────────────────►│
       │                   │  (amount + fee)   │
       │                   │                   │
       │ 6. Transfer       │                   │
       │◄──────────────────┤                   │
       │   FULL Amount     │                   │
       │   (no commission) │                   │
```

---

## 6. Cron Jobs

### 6.1 Cron Job Infrastructure

**File**: `src/core/cron/baseCron.ts`

```typescript
import cron from 'node-cron';
import { Logger } from 'pino';

export abstract class BaseCronJob {
  protected logger: Logger;
  protected jobName: string;
  protected schedule: string;
  protected isRunning: boolean = false;

  constructor(jobName: string, schedule: string, logger: Logger) {
    this.jobName = jobName;
    this.schedule = schedule;
    this.logger = logger.child({ cron: jobName });
  }

  /**
   * Register the cron job
   */
  register(): void {
    cron.schedule(this.schedule, async () => {
      if (this.isRunning) {
        this.logger.warn('Job already running, skipping');
        return;
      }

      this.isRunning = true;
      const startTime = Date.now();

      try {
        this.logger.info('Cron job started');
        await this.execute();
        this.logger.info({ duration: Date.now() - startTime }, 'Cron job completed');
      } catch (error) {
        this.logger.error({ error, duration: Date.now() - startTime }, 'Cron job failed');
      } finally {
        this.isRunning = false;
      }
    });

    this.logger.info({ schedule: this.schedule }, 'Cron job registered');
  }

  /**
   * Execute the job - implemented by subclasses
   */
  protected abstract execute(): Promise<void>;
}
```

### 6.2 Weekly Payout Processor

**File**: `src/core/cron/weeklyPayoutProcessor.cron.ts`

```typescript
export class WeeklyPayoutProcessorCron extends BaseCronJob {
  constructor(
    private paymentService: ContractPaymentService,
    private emailService: EmailService,
    logger: Logger
  ) {
    super('weekly-payout-processor', '59 23 * * 1', logger);  // Monday 23:59 UTC
  }

  protected async execute(): Promise<void> {
    // Get previous week range
    const lastMonday = moment().utc().startOf('isoWeek').subtract(1, 'week');
    const lastSunday = moment().utc().endOf('isoWeek').subtract(1, 'week');

    this.logger.info({
      weekStart: lastMonday.toISOString(),
      weekEnd: lastSunday.toISOString()
    }, 'Processing weekly payouts');

    // Get approved timelogs for the week
    const timelogs = await TimelogEntry.aggregate([
      {
        $match: {
          workDate: { $gte: lastMonday.toDate(), $lte: lastSunday.toDate() },
          status: TimelogStatus.APPROVED
        }
      },
      {
        $group: {
          _id: '$contractId',
          totalMinutes: { $sum: '$totalMinutes' },
          timelogs: { $push: '$$ROOT' }
        }
      }
    ]);

    let successCount = 0;
    let failCount = 0;

    for (const group of timelogs) {
      try {
        await this.processContractPayout(
          group._id,
          group.timelogs,
          group.totalMinutes,
          lastMonday,
          lastSunday
        );
        successCount++;
      } catch (error) {
        this.logger.error({ contractId: group._id, error }, 'Payout failed');
        failCount++;
      }
    }

    this.logger.info({ successCount, failCount }, 'Weekly payout complete');
  }

  private async processContractPayout(
    contractId: ObjectId,
    timelogs: ITimelogEntry[],
    totalMinutes: number,
    weekStart: moment.Moment,
    weekEnd: moment.Moment
  ): Promise<void> {
    const contract = await Contract.findById(contractId);
    if (!contract) throw new Error('Contract not found');

    const hoursWorked = totalMinutes / 60;
    const amount = hoursWorked * contract.hourlyProposedPrice;
    const fees = this.paymentService.calculateFees(amount);

    const idempotencyKey = `weekly-${contractId}-${weekStart.format('YYYYWW')}`;

    try {
      // Create payment
      const payment = await this.paymentService.processTimelogPayment({
        contractId,
        timelogIds: timelogs.map(t => t._id),
        hoursWorked,
        hourlyRate: contract.hourlyProposedPrice,
        weekNumber: weekStart.isoWeek(),
        year: weekStart.year(),
        weekStartDate: weekStart.toDate(),
        weekEndDate: weekEnd.toDate(),
        idempotencyKey
      });

      // Update timelogs to paid
      await TimelogEntry.updateMany(
        { _id: { $in: timelogs.map(t => t._id) } },
        { status: TimelogStatus.PAID, paymentId: payment._id, paidAt: new Date() }
      );

      // Send emails
      const [client, expert] = await Promise.all([
        User.findById(contract.createdBy),
        User.findById(contract.asssignedExpertId)
      ]);

      await this.emailService.sendWeeklyPayoutEmails(contract, payment, client, expert);

    } catch (error) {
      // Create pending payment for retry
      await PendingPayment.create({
        idempotencyKey,
        contractId,
        jobId: contract.jobId,
        expertId: contract.asssignedExpertId,
        clientId: contract.createdBy,
        clientHubId: contract.clientHubId,
        expertHubId: contract.expertHubId,
        amount: Math.round(fees.grossAmount * 100),
        grossAmount: fees.grossAmount,
        currency: 'USD',
        paymentMethodId: contract.paymentMethodId,
        stripeCustomerId: contract.stripeCustomerId,
        timelogIds: timelogs.map(t => t._id),
        totalHours: hoursWorked,
        weekNumber: weekStart.isoWeek(),
        year: weekStart.year(),
        weekStartDate: weekStart.toDate(),
        weekEndDate: weekEnd.toDate(),
        status: PendingPaymentStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: moment().add(24, 'hours').toDate(),
        retryHistory: [{
          attemptNumber: 1,
          attemptedAt: new Date(),
          success: false,
          errorMessage: (error as Error).message
        }]
      });

      // Send failure email
      const client = await User.findById(contract.createdBy);
      await this.emailService.sendPaymentFailureEmail(
        contract,
        client,
        fees.grossAmount,
        'Payment method declined'
      );

      throw error;
    }
  }
}
```

### 6.3 All Cron Jobs Summary

| Cron Job | Schedule | File |
|----------|----------|------|
| Weekly Payout | `59 23 * * 1` (Mon 23:59 UTC) | `weeklyPayoutProcessor.cron.ts` |
| Retry Payments | `0 */6 * * *` (Every 6 hours) | `retryPendingPayments.cron.ts` |
| Transfer Balance | `0 */12 * * *` (Every 12 hours) | `transferStripeBalance.cron.ts` |
| Apply Terms | `0 1 * * 1` (Mon 01:00 UTC) | `applyContractTermsUpdates.cron.ts` |
| Auto-Release | `0 2 * * *` (Daily 02:00 UTC) | `autoReleasePayment.cron.ts` |
| Close Expired Jobs | `0 0 * * *` (Daily 00:00 UTC) | `closeExpiredJobs.cron.ts` |

**Note:** Emails are sent directly via `EmailService.sendEmail()` which logs to EmailLog collection. Actual email sending logic will be added to that function later.

---

## 7. Event System

### 7.1 Domain Events

**File**: `src/core/events/domainEvents.ts`

```typescript
// Event types
export const DomainEvents = {
  // Contract events
  CONTRACT_OFFER_SENT: 'contract.offer.sent',
  CONTRACT_OFFER_ACCEPTED: 'contract.offer.accepted',
  CONTRACT_OFFER_DECLINED: 'contract.offer.declined',
  CONTRACT_COMPLETED: 'contract.completed',
  CONTRACT_CANCELLED: 'contract.cancelled',

  // Milestone events
  MILESTONE_CREATED: 'milestone.created',
  MILESTONE_FUNDED: 'milestone.funded',
  MILESTONE_WORK_SUBMITTED: 'milestone.work.submitted',
  MILESTONE_APPROVED: 'milestone.approved',
  MILESTONE_REVISION_REQUESTED: 'milestone.revision.requested',
  MILESTONE_RELEASED: 'milestone.released',
  MILESTONE_COMPLETED: 'milestone.completed',

  // Timelog events
  TIMELOG_SUBMITTED: 'timelog.submitted',
  TIMELOG_APPROVED: 'timelog.approved',
  TIMELOG_REJECTED: 'timelog.rejected',

  // Payment events
  PAYMENT_FUNDED: 'payment.funded',
  PAYMENT_RELEASED: 'payment.released',
  PAYMENT_TRANSFERRED: 'payment.transferred',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_FAILED: 'payment.failed'
} as const;
```

### 7.2 Event Handlers

**File**: `src/core/events/handlers/contractEventHandlers.ts`

```typescript
export function registerContractEventHandlers(
  eventEmitter: EventEmitter,
  emailService: EmailService,
  logger: Logger
) {
  // Handle offer sent
  eventEmitter.on(DomainEvents.CONTRACT_OFFER_SENT, async (payload) => {
    const { contractId, expertId } = payload;

    try {
      const [contract, expert] = await Promise.all([
        Contract.findById(contractId),
        User.findById(expertId)
      ]);

      await emailService.sendOfferSentEmail(contract, expert);
      logger.info({ contractId }, 'Offer sent email processed');
    } catch (error) {
      logger.error({ contractId, error }, 'Failed to process offer sent email');
    }
  });

  // Handle offer accepted
  eventEmitter.on(DomainEvents.CONTRACT_OFFER_ACCEPTED, async (payload) => {
    const { contractId, expertId, clientId } = payload;

    try {
      const [contract, expert, client] = await Promise.all([
        Contract.findById(contractId),
        User.findById(expertId),
        User.findById(clientId)
      ]);

      await emailService.sendOfferAcceptedEmails(contract, expert, client);
      logger.info({ contractId }, 'Offer accepted emails processed');
    } catch (error) {
      logger.error({ contractId, error }, 'Failed to process offer accepted emails');
    }
  });

  // Handle milestone funded
  eventEmitter.on(DomainEvents.MILESTONE_FUNDED, async (payload) => {
    const { milestoneId } = payload;

    try {
      const milestone = await Milestone.findById(milestoneId);
      const contract = await Contract.findById(milestone.contractId);
      const expert = await User.findById(contract.asssignedExpertId);

      await emailService.sendMilestoneFundedEmail(milestone, contract, expert);
      logger.info({ milestoneId }, 'Milestone funded email processed');
    } catch (error) {
      logger.error({ milestoneId, error }, 'Failed to process milestone funded email');
    }
  });

  // ... other handlers
}
```

---

## 8. Error Handling

### 8.1 Custom Error Classes

**File**: `src/core/errors/index.ts`

```typescript
// Base application error
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Domain-specific errors
export class ContractError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`CONTRACT_${code}`, message, ContractError.getStatusCode(code), details);
  }

  private static getStatusCode(code: string): number {
    const codes: Record<string, number> = {
      NOT_FOUND: 404,
      INVALID_STATUS: 400,
      UNAUTHORIZED: 403,
      VALIDATION_ERROR: 400
    };
    return codes[code] || 500;
  }
}

export class PaymentError extends AppError {
  constructor(code: string, message?: string, details?: Record<string, unknown>) {
    const messages: Record<string, string> = {
      MILESTONE_NOT_FOUND: 'Milestone not found',
      CONTRACT_NOT_FOUND: 'Contract not found',
      PAYMENT_NOT_FOUND: 'Payment not found',
      INVALID_STATUS: 'Invalid payment status',
      ALREADY_TRANSFERRED: 'Payment already transferred',
      NO_CONNECT_ACCOUNT: 'Expert has no connected Stripe account',
      STRIPE_ERROR: 'Payment processing error'
    };
    super(`PAYMENT_${code}`, message || messages[code] || code, 400, details);
  }
}

export class MilestoneError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`MILESTONE_${code}`, message, 400, details);
  }
}

export class TimelogError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`TIMELOG_${code}`, message, 400, details);
  }
}
```

### 8.2 Error Handler Middleware

**File**: `src/core/middlewares/errorHandler.ts`

```typescript
export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.id;

  // Log error
  request.log.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    requestId
  }, 'Request error');

  // Handle operational errors
  if (error instanceof AppError && error.isOperational) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Handle Stripe errors
  if ((error as any).type?.startsWith('Stripe')) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'PAYMENT_STRIPE_ERROR',
        message: 'Payment processing error',
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Handle unknown errors
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
      timestamp: new Date().toISOString()
    }
  });
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation ✅ COMPLETED

#### 1.1 Models
- [x] Create/update `Contract` model with status history, version
- [x] Create/update `Milestone` model with order, revision tracking
- [x] Create/update `ContractPayment` model with idempotency, no platform fee
- [x] Create/update `TimelogEntry` model with clientHubId/expertHubId
- [x] Create/update `PendingPayment` model with idempotency, retry history
- [x] Add all indexes

#### 1.2 Infrastructure
- [x] Create custom error classes (`src/core/errors/index.ts`)
- [x] Use existing `stripe-fee.util.ts` for fee calculations

### Phase 2: Send Offer Backend API

#### 2.1 Backend
- [ ] Create `HubContractOfferService.sendOffer()`
- [ ] Create schemas for send offer
- [ ] Create controller and routes
- [ ] Implement milestone creation in transaction
- [ ] Implement fund first milestone (optional)

#### 2.2 Browser Testing (agent-browser)
- [ ] Login to app.mereka.io with test account
- [ ] Navigate to existing job with proposal
- [ ] Test Send Offer flow end-to-end
- [ ] Verify contract created in database
- [ ] Verify milestones created (if fixed price)

### Phase 3: Accept/Decline Offer

#### 3.1 Backend
- [ ] Implement `acceptOffer()` with payout validation
- [ ] Implement `declineOffer()` with refund logic
- [ ] Implement `requestChanges()`

#### 3.2 Browser Testing
- [ ] Test accept offer as expert
- [ ] Verify contract status changes to ACTIVE
- [ ] Verify job status changes to IN_PROGRESS

### Phase 4: Contract Details - Fixed Price

#### 4.1 Backend
- [ ] Implement get contract details endpoint
- [ ] Implement milestone actions (fund, submit, approve, release)
- [ ] Add financial summary calculation

#### 4.2 Browser Testing
- [ ] Test milestone funding
- [ ] Test work submission
- [ ] Test work approval and payment release

### Phase 5: Contract Details - Hourly

#### 5.1 Backend
- [ ] Implement timelog CRUD
- [ ] Implement submit/approve/reject
- [ ] Implement weekly summary
- [ ] Add terms update endpoint

### Phase 6: Cron Jobs

#### 6.1 Cron Infrastructure
- [ ] Weekly payout processor (existing, updated)
- [ ] Retry pending payments (existing, updated)
- [ ] Auto-release payments
- [ ] Close expired jobs

### Phase 7: E2E Testing & Polish

- [ ] Full E2E browser testing with agent-browser
- [ ] Integration tests
- [ ] Performance testing
- [ ] Documentation

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// Example: ContractPaymentService tests
describe('ContractPaymentService', () => {
  describe('calculateFees', () => {
    it('should calculate correct fees for $100 (no platform commission)', () => {
      const fees = service.calculateFees(100);

      expect(fees.amount).toBe(100);        // Expert receives full amount
      expect(fees.stripeFee).toBe(3.20);    // 2.9% + $0.30
      expect(fees.grossAmount).toBe(103.20); // Client pays amount + Stripe fee
      // No platformFee - Mereka revenue is subscription-based only
    });
  });

  describe('fundMilestone', () => {
    it('should be idempotent', async () => {
      const input = {
        milestoneId: milestone._id,
        paymentMethodId: 'pm_test',
        idempotencyKey: 'test-key'
      };

      const first = await service.fundMilestone(input, userId);
      const second = await service.fundMilestone(input, userId);

      expect(first._id).toEqual(second._id);
    });
  });
});
```

### 10.2 Integration Tests

```typescript
describe('POST /api/hub/contracts/send-offer', () => {
  it('should create contract with milestones', async () => {
    const response = await request(app)
      .post('/api/hub/contracts/send-offer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        jobId: job._id,
        jobProposalId: proposal._id,
        contractTitle: 'Test Contract',
        priceType: 'fixed',
        proposedPrice: 1000,
        hasMilestones: true,
        milestones: [
          { taskName: 'Phase 1', amount: 500, dueDate: '2026-02-01' },
          { taskName: 'Phase 2', amount: 500, dueDate: '2026-03-01' }
        ],
        paymentMethodId: 'pm_test'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.milestones).toHaveLength(2);
  });
});
```

---

## 11. File Structure

```
src/
├── core/
│   ├── models/
│   │   ├── Contract.ts
│   │   ├── Milestone.ts
│   │   ├── ContractPayment.ts
│   │   ├── TimelogEntry.ts
│   │   ├── EmailLog.ts
│   │   ├── PendingPayment.ts
│   │   └── AuditLog.ts
│   │
│   ├── services/
│   │   ├── base/
│   │   │   └── BaseService.ts
│   │   ├── hub/
│   │   │   ├── contracts/
│   │   │   │   ├── hubContractOffer.service.ts
│   │   │   │   └── index.ts
│   │   │   ├── milestones/
│   │   │   │   ├── hubMilestoneAction.service.ts
│   │   │   │   └── index.ts
│   │   │   └── timelogs/
│   │   │       ├── hubTimelog.service.ts
│   │   │       └── index.ts
│   │   └── shared/
│   │       ├── payments/
│   │       │   ├── contractPayment.service.ts
│   │       │   └── index.ts
│   │       ├── email/
│   │       └── pending-payment/
│   │           ├── pending-payment.service.ts
│   │           └── index.ts
│   │
│   ├── schemas/hub/
│   │   ├── contracts/
│   │   │   ├── hubContractOffer.schema.ts
│   │   │   └── index.ts
│   │   ├── milestones/
│   │   │   └── hubMilestoneAction.schema.ts
│   │   └── timelogs/
│   │       └── hubTimelog.schema.ts
│   │
│   ├── cron/
│   │   ├── baseCron.ts
│   │   ├── weeklyPayoutProcessor.cron.ts
│   │   ├── retryPendingPayments.cron.ts
│   │   ├── transferStripeBalance.cron.ts
│   │   ├── applyContractTermsUpdates.cron.ts
│   │   ├── autoReleasePayment.cron.ts
│   │   ├── closeExpiredJobs.cron.ts
│   │   └── index.ts
│   │
│   ├── events/
│   │   ├── domainEvents.ts
│   │   ├── handlers/
│   │   │   ├── contractEventHandlers.ts
│   │   │   ├── milestoneEventHandlers.ts
│   │   │   └── paymentEventHandlers.ts
│   │   └── index.ts
│   │
│   ├── errors/
│   │   └── index.ts
│   │
│   └── config/
│       └── stripe.config.ts
│
└── modules/hub/
    ├── controllers/
    │   ├── contracts/
    │   │   ├── hubContractOffer.controller.ts
    │   │   └── index.ts
    │   ├── milestones/
    │   │   └── hubMilestoneAction.controller.ts
    │   └── timelogs/
    │       └── hubTimelog.controller.ts
    │
    └── routes/
        ├── contracts/
        │   ├── hubContractOffer.routes.ts
        │   └── index.ts
        ├── milestones/
        │   └── hubMilestoneAction.routes.ts
        └── timelogs/
            └── hubTimelog.routes.ts
```

---

## 12. Browser Testing with agent-browser

### 12.1 Test Environment Setup

**Prerequisites:**
- User account with Hub member access (for sending offers)
- User account with Expert access (for accepting offers)
- Job already created with submitted proposal

### 12.2 Send Offer Test Flow

```
1. Login to app.mereka.io
2. Navigate to Jobs → [Job with Proposal]
3. Click on submitted proposal
4. Click "Send Offer" button
5. Fill offer details:
   - Contract title
   - Description
   - Price type (fixed/hourly)
   - Amount/Rate
   - Milestones (if fixed)
   - Payment method
6. Submit offer
7. Verify:
   - Contract created in database
   - Milestones created (if fixed price)
   - Expert receives notification
```

### 12.3 Accept Offer Test Flow

```
1. Login as Expert
2. Navigate to Contracts → Pending Offers
3. Click on offer
4. Review contract terms
5. Click "Accept Offer"
6. Verify:
   - Contract status = ACTIVE
   - Job status = IN_PROGRESS
   - Client receives notification
```

### 12.4 Milestone Flow Test (Fixed Price)

```
1. Client funds milestone
2. Expert submits work
3. Client reviews and approves
4. Payment released
5. Verify:
   - ContractPayment created
   - Transaction recorded
   - Expert receives full amount (no commission)
```

---

## 13. Success Criteria

- [ ] All v1 functionality replicated
- [ ] Single Stripe Atlas account integration (USD only)
- [ ] **NO platform commission** - expert receives full payment amount
- [ ] Stripe fee (2.9% + $0.30) passed to client correctly
- [ ] All payment flows working in Stripe test mode
- [ ] Idempotent payment operations
- [ ] Transaction logging for audit trail
- [ ] Proper error handling
- [ ] Event-driven architecture
- [ ] Performance: API responses < 500ms
- [ ] All cron jobs running reliably
- [ ] **Browser testing completed** with agent-browser

---

## 14. Frontend UI Implementation Plan (V1 Parity)

### 14.1 V1 vs V2 Frontend Feature Matrix

| Feature | V1 Status | V2 Status | Priority |
|---------|-----------|-----------|----------|
| **Hub Dashboard (Client/Employer Side)** |
| All Job Posts Tab | ✅ | ✅ | Done |
| All Proposals Tab | ✅ | ✅ | Done |
| All Hires Tab (Contracts List) | ✅ | ✅ | Done |
| Send Offer Page | ✅ | ✅ | Done |
| **Expert Dashboard (Expert/Freelancer Side)** |
| Contracted Tab | ✅ | ✅ | Done |
| Proposed Tab | ✅ | ✅ | Done |
| View Offer Page (Accept/Decline) | ✅ | ✅ | Done |
| **Contract Details (CRITICAL)** |
| Contract Header with Profiles | ✅ | ❌ Missing | HIGH |
| Financial Overview Card | ✅ | ⚠️ Basic | HIGH |
| Milestone Timeline (Visual) | ✅ | ❌ Missing | HIGH |
| Transaction History | ✅ | ❌ Missing | HIGH |
| Contract Summary Section | ✅ | ⚠️ Basic | HIGH |
| Review Section | ✅ | ❌ Missing | MEDIUM |
| **Milestone Actions (Fixed Price)** |
| Fund Milestone Dialog | ✅ | ❌ Missing | HIGH |
| Submit Work Dialog | ✅ | ⚠️ Basic | MEDIUM |
| Release Payment Dialog | ✅ | ❌ Missing | HIGH |
| Work Submitted Confirmation | ✅ | ❌ Missing | LOW |
| **Payment Management** |
| Add Payment Method Dialog | ✅ | ❌ Missing | HIGH |
| Payment Methods List | ✅ | ❌ Missing | HIGH |
| Set Default Payment Method | ✅ | ❌ Missing | HIGH |

### 14.2 V1 Contract Details Page Structure

Based on analysis of v1 source code at `/mereka-web/src/app/pages/job/hub-job-offer/hub-job-contract-details/`:

```
contract-details-fixed-price/
├── contract-details-fixed-price.component.ts  # Main container
├── contract-details-fixed-price.component.html
└── contract-details-fixed-price.component.scss

components/
├── contract-details-header/          # Client/Expert profiles, tabs, status
├── contract-details-financial-overview/  # Total, Escrow, Paid, Pending
├── contract-details-milestone-timeline/  # Visual timeline with actions
├── contract-details-transaction-history/ # All payments list
├── contract-details-summary/         # Description, files, terms
├── contract-details-review/          # Mutual reviews
├── dialog-fund-milestone/            # Fund single/all/specific
├── dialog-release-payment/           # Release single/all/specific
├── dialog-submit-work-fixed/         # Expert submits work
└── dialog-work-submitted-fixed/      # Confirmation dialog
```

### 14.3 V1 Key Component Details

#### Contract Header Component
```html
<!-- Profile cards for both parties -->
<div class="contract-details-header">
  <div class="profile-card client">
    <img [src]="clientProfile.profileImage" />
    <h3>{{ clientProfile.name }}</h3>
    <p>{{ clientHub.name }}</p>
  </div>
  <div class="profile-card expert">
    <img [src]="expertProfile.profileImage" />
    <h3>{{ expertProfile.name }}</h3>
    <p>{{ expertHub?.name }}</p>
  </div>
  <div class="contract-info">
    <h2>{{ contract.contractTitle }}</h2>
    <span class="status-badge">{{ contract.status }}</span>
    <div class="tabs">
      <a href="#worklog">Worklog</a>
      <a href="#transaction">Transaction</a>
      <a href="#details">Details</a>
      <a href="#review">Review</a>
    </div>
  </div>
</div>
```

#### Financial Overview Component
```html
<!-- Financial summary card -->
<div class="financial-overview">
  <!-- Client View -->
  <div *ngIf="!isExpertAccessing" class="stats-grid">
    <div class="stat">
      <label>Budget</label>
      <value>{{ contract.proposedPrice | currency }}</value>
    </div>
    <div class="stat">
      <label>In Escrow</label>
      <value>{{ getInEscrowAmount() | currency }}</value>
    </div>
    <div class="stat">
      <label>Paid to Date</label>
      <value>{{ getPaidAmount() | currency }}</value>
    </div>
    <div class="stat">
      <label>Remaining</label>
      <value>{{ getRemainingAmount() | currency }}</value>
    </div>
  </div>
  
  <!-- Expert View -->
  <div *ngIf="isExpertAccessing" class="stats-grid">
    <div class="stat">
      <label>Contract Value</label>
      <value>{{ contract.proposedPrice | currency }}</value>
    </div>
    <div class="stat">
      <label>Earned</label>
      <value>{{ getEarnedAmount() | currency }}</value>
    </div>
    <div class="stat">
      <label>Pending</label>
      <value>{{ getPendingAmount() | currency }}</value>
    </div>
  </div>
</div>
```

#### Milestone Timeline Component (CRITICAL - Most Complex)
```html
<!-- Visual timeline with milestone circles -->
<div class="milestone-timeline">
  <div class="timeline-line"></div>
  
  <div *ngFor="let milestone of milestones; let i = index" class="milestone-item">
    <!-- Status indicator circle -->
    <div class="milestone-circle" [class]="milestone.status">
      <span *ngIf="milestone.status === 'completed'">✓</span>
      <span *ngIf="milestone.status !== 'completed'">{{ i + 1 }}</span>
    </div>
    
    <!-- Milestone info -->
    <div class="milestone-info">
      <h4>{{ milestone.taskName }}</h4>
      <p class="amount">{{ milestone.amount | currency }}</p>
      <span class="status-label" [class]="milestone.status">
        {{ getStatusLabel(milestone.status) }}
      </span>
      <p class="due-date">Due: {{ milestone.dueDate | date }}</p>
      
      <!-- Action buttons based on status and user role -->
      <div class="actions" [ngSwitch]="milestone.status">
        <!-- Client: Fund pending milestone -->
        <button *ngSwitchCase="'pending'" 
                *ngIf="!isExpert"
                (click)="openFundMilestoneDialog(milestone)">
          Fund Milestone
        </button>
        
        <!-- Expert: Submit work for funded milestone -->
        <button *ngSwitchCase="'funded'" 
                *ngIf="isExpert"
                (click)="openSubmitWorkDialog(milestone)">
          Submit Work
        </button>
        
        <!-- Client: Release payment for submitted work -->
        <button *ngSwitchCase="'work_submitted'" 
                *ngIf="!isExpert"
                (click)="openReleasePaymentDialog(milestone)">
          Release Payment
        </button>
        
        <!-- Both: View work submitted -->
        <button *ngSwitchCase="'work_submitted'"
                (click)="viewSubmittedWork(milestone)">
          View Work
        </button>
      </div>
    </div>
  </div>
</div>
```

#### Fund Milestone Dialog
```html
<div class="dialog-fund-milestone">
  <h2>Fund Milestone</h2>
  
  <!-- Funding options -->
  <div class="funding-options">
    <label>
      <input type="radio" [(ngModel)]="selectedOption" value="single">
      Fund this milestone only ({{ selectedMilestone.amount | currency }})
    </label>
    <label>
      <input type="radio" [(ngModel)]="selectedOption" value="all">
      Fund all pending milestones ({{ totalPendingAmount | currency }})
    </label>
    <label>
      <input type="radio" [(ngModel)]="selectedOption" value="specific">
      Select specific milestones
    </label>
  </div>
  
  <!-- Specific milestone selection -->
  <div *ngIf="selectedOption === 'specific'" class="milestone-selection">
    <div *ngFor="let m of pendingMilestones" class="milestone-checkbox">
      <label>
        <input type="checkbox" 
               [checked]="isSelected(m)"
               (change)="toggleMilestone(m)">
        {{ m.taskName }} - {{ m.amount | currency }}
      </label>
    </div>
  </div>
  
  <!-- Payment summary -->
  <div class="payment-summary">
    <div class="line">
      <span>Milestone Amount</span>
      <span>{{ getTotalAmount() | currency }}</span>
    </div>
    <div class="line">
      <span>Processing Fee (2.9% + $0.30)</span>
      <span>{{ getStripeFee() | currency }}</span>
    </div>
    <div class="line total">
      <span>Total</span>
      <span>{{ getTotalWithFee() | currency }}</span>
    </div>
  </div>
  
  <!-- Payment method -->
  <div class="payment-method">
    <h4>Payment Method</h4>
    <div class="card-display" *ngIf="defaultPaymentMethod">
      <span class="brand">{{ defaultPaymentMethod.card.brand }}</span>
      <span class="last4">**** {{ defaultPaymentMethod.card.last4 }}</span>
    </div>
    <button *ngIf="!defaultPaymentMethod" (click)="addPaymentMethod()">
      Add Payment Method
    </button>
  </div>
  
  <div class="actions">
    <button (click)="close()">Cancel</button>
    <button (click)="fundMilestone()" [disabled]="isLoading">
      {{ isLoading ? 'Processing...' : 'Fund Milestone' }}
    </button>
  </div>
</div>
```

### 14.4 Frontend Implementation Phases

#### Phase A: Contract Details UI (5-7 days)

**A1: Contract Header Component (1 day)**
```
files to create:
- contract-details-header.component.ts
- contract-details-header.component.html
- contract-details-header.component.scss

features:
- Client and expert profile cards with images
- Contract title and status badge
- Navigation tabs (Worklog, Transaction, Details, Review)
- Responsive layout
```

**A2: Financial Overview Component (1 day)**
```
files to create:
- contract-details-financial.component.ts
- contract-details-financial.component.html

features:
- Different views for client vs expert
- Budget, In Escrow, Paid, Remaining (client)
- Contract Value, Earned, Pending (expert)
- Real-time calculation from milestone data
```

**A3: Milestone Timeline Component (2-3 days)**
```
files to create:
- contract-details-milestone-timeline.component.ts
- contract-details-milestone-timeline.component.html
- contract-details-milestone-timeline.component.scss

features:
- Visual timeline with status circles
- Status-based action buttons
- Fund/Submit/Release actions
- Work submission preview
- Progress indicator
```

**A4: Transaction History Component (1 day)**
```
files to create:
- contract-details-transactions.component.ts
- contract-details-transactions.component.html

features:
- List of all payments
- Date, amount, status columns
- Status indicators (In Escrow, Paid, Failed)
- Group by week for hourly contracts
```

**A5: Contract Summary Component (0.5 day)**
```
files to create:
- contract-details-summary.component.ts
- contract-details-summary.component.html

features:
- Contract description
- Uploaded files list with download
- Contract terms
- Start/End dates
```

#### Phase B: Milestone Action Dialogs (3-4 days)

**B1: Fund Milestone Dialog (1.5 days)**
```
features:
- Single/All/Specific milestone selection
- Payment method display
- Fee calculation display
- Stripe payment integration
- Loading states and error handling
```

**B2: Submit Work Dialog (1 day)**
```
features:
- Description textarea
- File upload (Firebase Storage)
- Preview before submit
- Confirmation dialog
```

**B3: Release Payment Dialog (1.5 days)**
```
features:
- Single/All/Specific release options
- Amount breakdown
- Confirmation before release
- Success notification
```

#### Phase C: Payment Method Management (2-3 days)

**C1: Add Payment Method Dialog (1.5 days)**
```
features:
- Stripe Elements integration
- Card validation
- Save card for future use
- Error handling
```

**C2: Payment Settings Page (1.5 days)**
```
features:
- List saved payment methods
- Set default payment method
- Remove payment method
- Add new payment method
```

### 14.5 Frontend File Structure

```
projects/app/src/app/features/hub-dashboard/
├── pages/jobs/
│   ├── contracts/
│   │   └── contract-details/
│   │       ├── components/
│   │       │   ├── contract-details-header/
│   │       │   │   ├── contract-details-header.component.ts
│   │       │   │   └── contract-details-header.component.html
│   │       │   ├── contract-details-financial/
│   │       │   │   ├── contract-details-financial.component.ts
│   │       │   │   └── contract-details-financial.component.html
│   │       │   ├── contract-details-milestone-timeline/
│   │       │   │   ├── contract-details-milestone-timeline.component.ts
│   │       │   │   ├── contract-details-milestone-timeline.component.html
│   │       │   │   └── contract-details-milestone-timeline.component.scss
│   │       │   ├── contract-details-transactions/
│   │       │   │   └── contract-details-transactions.component.ts
│   │       │   ├── contract-details-summary/
│   │       │   │   └── contract-details-summary.component.ts
│   │       │   └── contract-details-review/
│   │       │       └── contract-details-review.component.ts
│   │       ├── dialogs/
│   │       │   ├── dialog-fund-milestone/
│   │       │   │   ├── dialog-fund-milestone.component.ts
│   │       │   │   └── dialog-fund-milestone.component.html
│   │       │   ├── dialog-submit-work/
│   │       │   │   └── dialog-submit-work.component.ts
│   │       │   └── dialog-release-payment/
│   │       │       └── dialog-release-payment.component.ts
│   │       ├── contract-details.component.ts
│   │       └── contract-details.component.html
│   └── ...
├── pages/settings/
│   └── payments/
│       ├── payment-settings.component.ts
│       ├── add-payment-method-dialog/
│       └── payment-method-list/
└── services/
    ├── hub-jobs-api.service.ts  # Add new methods
    └── hub-payments-api.service.ts  # New service
```

### 14.6 API Endpoints Needed for Frontend

#### Contract Details API
```typescript
// Already exists - may need enhancement
GET /api/v1/hub/:hubId/contracts/:contractId
Response: Contract with populated fields

// NEW: Get contract transactions
GET /api/v1/hub/:hubId/contracts/:contractId/transactions
Response: { items: ContractPayment[], pagination }
```

#### Milestone Actions API
```typescript
// Already exists
POST /api/v1/hub/milestones/:milestoneId/fund
POST /api/v1/hub/milestones/:milestoneId/submit-work
POST /api/v1/hub/milestones/:milestoneId/approve

// NEW: Fund multiple milestones
POST /api/v1/hub/milestones/fund-multiple
Body: { milestoneIds: string[], paymentMethodId: string }

// NEW: Release multiple milestones
POST /api/v1/hub/milestones/release-multiple
Body: { milestoneIds: string[] }
```

#### Payment Methods API (NEW)
```typescript
// Get payment methods
GET /api/v1/users/me/payment-methods
Response: { items: PaymentMethod[] }

// Add payment method
POST /api/v1/users/me/payment-methods
Body: { paymentMethodId: string }

// Remove payment method
DELETE /api/v1/users/me/payment-methods/:paymentMethodId

// Set default payment method
PATCH /api/v1/users/me/payment-methods/:paymentMethodId/default
```

---

## 15. V2 Implementation Status Summary

### Backend Status ✅ MOSTLY COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Contract Model | ✅ Complete | With status history, hubIds |
| Milestone Model | ✅ Complete | With order, change tracking |
| ContractPayment Model | ✅ Complete | With idempotency |
| TimelogEntry Model | ✅ Complete | With clientHubId/expertHubId |
| Send Offer API | ✅ Complete | Creates contract + milestones |
| Accept Offer API | ✅ Complete | With Stripe validation |
| Decline Offer API | ✅ Complete | With refund logic |
| Fund Milestone API | ✅ Complete | With payment processing |
| Submit Work API | ✅ Complete | Expert submits |
| Approve Milestone API | ✅ Complete | Client approves |
| Release Payment API | ⚠️ Partial | Need release-multiple |
| Timelog CRUD | ✅ Complete | All operations |
| Weekly Payout Cron | ✅ Complete | Hourly contract payouts |
| Auto-Release Cron | ✅ Complete | 7-day auto-release |
| Notifications | ✅ Complete | All offer/milestone events |

### Frontend Status ⚠️ NEEDS UI WORK

| Feature | Status | Priority |
|---------|--------|----------|
| Job Posts Page | ✅ Complete | - |
| Applications Page | ✅ Complete | - |
| Send Offer Page | ✅ Complete | - |
| View Offer Page | ✅ Complete | - |
| Contract Details Page | ⚠️ Basic | HIGH |
| Milestone Timeline | ❌ Missing | HIGH |
| Fund Milestone Dialog | ❌ Missing | HIGH |
| Release Payment Dialog | ❌ Missing | HIGH |
| Transaction History | ❌ Missing | HIGH |
| Payment Method Management | ❌ Missing | HIGH |
| Review System | ❌ Missing | MEDIUM |

### Priority Order for Frontend Implementation

1. **HIGH** - Contract Details UI Enhancement (Phase A)
2. **HIGH** - Milestone Timeline Component
3. **HIGH** - Fund Milestone Dialog
4. **HIGH** - Release Payment Dialog
5. **HIGH** - Payment Method Management
6. **MEDIUM** - Transaction History
7. **MEDIUM** - Review System

---

*Document Version: 2.2*
*Last Updated: January 23, 2026*
