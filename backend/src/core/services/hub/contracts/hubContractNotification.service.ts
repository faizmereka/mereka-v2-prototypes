import { Contract } from '@core/models/Contract';
import { Milestone } from '@core/models/Milestone';
import { TimelogEntry } from '@core/models/TimelogEntry';
import { User } from '@core/models/User';
import { communicationTriggerService } from '@services/communications';

/**
 * Contract Notification Template IDs
 * Maps to templates seeded in InAppNotificationTemplate, EmailTemplate, and WhatsAppTemplate
 */
export enum ContractNotificationTemplate {
  JOB_OFFER_RECEIVED = 'JOB_OFFER_RECEIVED',
  JOB_OFFER_ACCEPTED = 'JOB_OFFER_ACCEPTED',
  JOB_OFFER_DECLINED = 'JOB_OFFER_DECLINED',
  CONTRACT_CREATED = 'CONTRACT_CREATED',
  CONTRACT_PAUSED = 'CONTRACT_PAUSED',
  CONTRACT_RESUMED = 'CONTRACT_RESUMED',
  TERMS_UPDATE_REQUESTED = 'TERMS_UPDATE_REQUESTED',
  TERMS_UPDATE_APPLIED = 'TERMS_UPDATE_APPLIED',
  MILESTONE_SUBMITTED = 'MILESTONE_SUBMITTED',
  MILESTONE_APPROVED = 'MILESTONE_APPROVED',
  MILESTONE_REJECTED = 'MILESTONE_REJECTED',
  MILESTONE_AUTO_RELEASED = 'MILESTONE_AUTO_RELEASED',
  MILESTONE_FUNDED = 'MILESTONE_FUNDED',
  MILESTONE_FUNDING_FAILED = 'MILESTONE_FUNDING_FAILED',
  MILESTONE_RELEASE_FAILED = 'MILESTONE_RELEASE_FAILED',
  TIMELOG_SUBMITTED = 'TIMELOG_SUBMITTED',
  TIMELOG_APPROVED = 'TIMELOG_APPROVED',
  TIMELOG_REJECTED = 'TIMELOG_REJECTED',
  TIMELOG_PAYMENT_RECEIVED = 'TIMELOG_PAYMENT_RECEIVED',
  CONTRACT_CANCELLED_EXPERT = 'CONTRACT_CANCELLED_EXPERT',
  CONTRACT_CANCELLED_CLIENT = 'CONTRACT_CANCELLED_CLIENT',
  CONTRACT_COMPLETED = 'CONTRACT_COMPLETED',
  WEEKLY_PAYOUT_PROCESSED = 'WEEKLY_PAYOUT_PROCESSED',
  WEEKLY_PAYOUT_FAILED = 'WEEKLY_PAYOUT_FAILED',
  PAYMENT_RETRY_FAILED = 'PAYMENT_RETRY_FAILED',
  PAYMENT_PERMANENTLY_FAILED = 'PAYMENT_PERMANENTLY_FAILED',
}

/**
 * Contract Notification Service
 *
 * Handles multi-channel notifications for contract-related events using communicationTriggerService:
 * - Job offers (sent, accepted, declined)
 * - Milestones (submitted, approved, rejected, auto-released)
 * - Timelogs (submitted, approved, rejected)
 * - Contract status changes
 * - Payment notifications
 *
 * Uses the unified communicationTriggerService which:
 * - Sends to inApp, email, and whatsApp channels based on template configuration
 * - Respects user and hub notification preferences
 * - Creates logs in respective collections
 */
export class HubContractNotificationService {
  /**
   * Helper to get user data for communication trigger
   */
  private async getUserData(
    userId: string,
  ): Promise<{ _id: string; name?: string; email?: string; phone?: string } | null> {
    const user = await User.findById(userId).select('name email phoneNumber').lean();
    if (!user) return null;
    return {
      _id: userId,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
    };
  }

  /**
   * Helper to extract ObjectId from populated or unpopulated field
   */
  private getIdString(field: unknown): string | undefined {
    if (!field) return undefined;
    // If it's a populated object with _id
    if (typeof field === 'object' && field !== null && '_id' in field) {
      return (field as { _id: unknown })._id?.toString();
    }
    // If it's already an ObjectId or string
    return field.toString();
  }

  /**
   * Notify expert about new job offer
   * Note: hubId is set to expertHubId so expert sees this in THEIR hub dashboard
   */
  async notifyJobOfferReceived(contractId: string): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('clientHubId', 'name')
        .populate('expertHubId', 'name')
        .populate('createdBy', 'name')
        .lean();

      if (!contract) return;

      const clientHub = contract.clientHubId as { _id?: unknown; name?: string } | undefined;
      const clientHubName = clientHub?.name || 'A client';
      // Use expert's hubId so they see it in their hub dashboard
      const expertHubId = this.getIdString(contract.expertHubId);
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());

      if (!expertUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.JOB_OFFER_RECEIVED,
        user: expertUser,
        hubId: expertHubId,
        data: {
          userName: expertUser.name,
          userEmail: expertUser.email,
          userPhone: expertUser.phone,
          hubName: clientHubName,
          contractTitle: contract.contractTitle,
          contractId: contractId,
        },
      });
    } catch (error) {
      console.error('Failed to send job offer received notification:', error);
    }
  }

  /**
   * Notify client that expert accepted the offer
   */
  async notifyJobOfferAccepted(contractId: string): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('asssignedExpertId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as unknown as
        | { name?: string; _id?: string }
        | undefined;
      const expertName = expert?.name || 'The expert';
      const clientUser = await this.getUserData(contract.createdBy.toString());

      if (!clientUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.JOB_OFFER_ACCEPTED,
        user: clientUser,
        hubId: this.getIdString(contract.clientHubId),
        data: {
          userName: clientUser.name,
          userEmail: clientUser.email,
          userPhone: clientUser.phone,
          expertName,
          contractTitle: contract.contractTitle,
          contractId: contractId,
        },
      });
    } catch (error) {
      console.error('Failed to send job offer accepted notification:', error);
    }
  }

  /**
   * Notify client that expert declined the offer
   */
  async notifyJobOfferDeclined(contractId: string, declineReason?: string): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('asssignedExpertId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientUser = await this.getUserData(contract.createdBy.toString());

      if (!clientUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.JOB_OFFER_DECLINED,
        user: clientUser,
        hubId: this.getIdString(contract.clientHubId),
        data: {
          userName: clientUser.name,
          userEmail: clientUser.email,
          userPhone: clientUser.phone,
          expertName,
          contractTitle: contract.contractTitle,
          contractId: contractId,
          declineReason: declineReason || '',
        },
      });
    } catch (error) {
      console.error('Failed to send job offer declined notification:', error);
    }
  }

  /**
   * Notify client that expert submitted work for a milestone
   */
  async notifyMilestoneSubmitted(milestoneId: string): Promise<void> {
    try {
      const milestone = await Milestone.findById(milestoneId).lean();
      if (!milestone) return;

      const contract = await Contract.findById(milestone.contractId)
        .populate('asssignedExpertId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientUser = await this.getUserData(contract.createdBy.toString());

      if (!clientUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.MILESTONE_SUBMITTED,
        user: clientUser,
        hubId: this.getIdString(contract.clientHubId),
        data: {
          userName: clientUser.name,
          userEmail: clientUser.email,
          userPhone: clientUser.phone,
          expertName,
          milestoneName: milestone.taskName,
          contractTitle: contract.contractTitle,
          contractId: contract._id?.toString(),
          milestoneId: milestoneId,
        },
      });
    } catch (error) {
      console.error('Failed to send milestone submitted notification:', error);
    }
  }

  /**
   * Notify expert that milestone was approved
   * Note: hubId is set to expertHubId so expert sees this in THEIR hub dashboard
   */
  async notifyMilestoneApproved(milestoneId: string): Promise<void> {
    try {
      const milestone = await Milestone.findById(milestoneId).lean();
      if (!milestone) return;

      const contract = await Contract.findById(milestone.contractId)
        .populate('clientHubId', 'name')
        .populate('expertHubId', 'name')
        .lean();

      if (!contract) return;

      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const clientHubName = clientHub?.name || 'The client';
      const expertHubId = this.getIdString(contract.expertHubId);
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());

      if (!expertUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.MILESTONE_APPROVED,
        user: expertUser,
        hubId: expertHubId,
        data: {
          userName: expertUser.name,
          userEmail: expertUser.email,
          userPhone: expertUser.phone,
          hubName: clientHubName,
          milestoneName: milestone.taskName,
          amount: milestone.amount || 0,
          currency: '$',
          contractTitle: contract.contractTitle,
          contractId: contract._id?.toString(),
          milestoneId: milestoneId,
        },
      });
    } catch (error) {
      console.error('Failed to send milestone approved notification:', error);
    }
  }

  /**
   * Notify expert that milestone was rejected
   * Note: hubId is set to expertHubId so expert sees this in THEIR hub dashboard
   */
  async notifyMilestoneRejected(milestoneId: string, rejectReason?: string): Promise<void> {
    try {
      const milestone = await Milestone.findById(milestoneId).lean();
      if (!milestone) return;

      const contract = await Contract.findById(milestone.contractId)
        .populate('clientHubId', 'name')
        .populate('expertHubId', 'name')
        .lean();

      if (!contract) return;

      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const clientHubName = clientHub?.name || 'The client';
      const expertHubId = this.getIdString(contract.expertHubId);
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());

      if (!expertUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.MILESTONE_REJECTED,
        user: expertUser,
        hubId: expertHubId,
        data: {
          userName: expertUser.name,
          userEmail: expertUser.email,
          userPhone: expertUser.phone,
          hubName: clientHubName,
          milestoneName: milestone.taskName,
          feedbackMessage: rejectReason || '',
          contractTitle: contract.contractTitle,
          contractId: contract._id?.toString(),
          milestoneId: milestoneId,
        },
      });
    } catch (error) {
      console.error('Failed to send milestone rejected notification:', error);
    }
  }

  /**
   * Notify both parties that milestone was auto-released
   * Note: Expert gets expertHubId, client gets clientHubId
   */
  async notifyMilestoneAutoReleased(milestoneId: string): Promise<void> {
    try {
      const milestone = await Milestone.findById(milestoneId).lean();
      if (!milestone) return;

      const contract = await Contract.findById(milestone.contractId).lean();
      if (!contract) return;

      // Notify expert (use expertHubId)
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());
      if (expertUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.MILESTONE_AUTO_RELEASED,
          user: expertUser,
          hubId: this.getIdString(contract.expertHubId),
          data: {
            userName: expertUser.name,
            userEmail: expertUser.email,
            userPhone: expertUser.phone,
            milestoneName: milestone.taskName,
            amount: milestone.amount || 0,
            currency: '$',
            autoReleaseDays: 7,
            contractTitle: contract.contractTitle,
          },
        });
      }

      // Notify client
      const clientUser = await this.getUserData(contract.createdBy.toString());
      if (clientUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.MILESTONE_AUTO_RELEASED,
          user: clientUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: clientUser.name,
            userEmail: clientUser.email,
            userPhone: clientUser.phone,
            milestoneName: milestone.taskName,
            amount: milestone.amount || 0,
            currency: '$',
            autoReleaseDays: 7,
            contractTitle: contract.contractTitle,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send milestone auto-released notification:', error);
    }
  }

  /**
   * Notify client that timelog was submitted for approval
   */
  async notifyTimelogSubmitted(timelogId: string): Promise<void> {
    try {
      const timelog = await TimelogEntry.findById(timelogId).lean();
      if (!timelog) return;

      const contract = await Contract.findById(timelog.contractId)
        .populate('asssignedExpertId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientUser = await this.getUserData(contract.createdBy.toString());

      if (!clientUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.TIMELOG_SUBMITTED,
        user: clientUser,
        hubId: this.getIdString(contract.clientHubId),
        data: {
          userName: clientUser.name,
          userEmail: clientUser.email,
          userPhone: clientUser.phone,
          expertName,
          hoursWorked: timelog.hoursWorked,
          contractTitle: contract.contractTitle,
          contractId: contract._id?.toString(),
        },
      });
    } catch (error) {
      console.error('Failed to send timelog submitted notification:', error);
    }
  }

  /**
   * Notify expert that timelog was approved
   * Note: hubId is set to expertHubId so expert sees this in THEIR hub dashboard
   */
  async notifyTimelogApproved(timelogId: string): Promise<void> {
    try {
      const timelog = await TimelogEntry.findById(timelogId).lean();
      if (!timelog) return;

      const contract = await Contract.findById(timelog.contractId)
        .populate('clientHubId', 'name')
        .populate('expertHubId', 'name')
        .lean();

      if (!contract) return;

      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const clientHubName = clientHub?.name || 'The client';
      const expertHubId = this.getIdString(contract.expertHubId);
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());

      if (!expertUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.TIMELOG_APPROVED,
        user: expertUser,
        hubId: expertHubId,
        data: {
          userName: expertUser.name,
          userEmail: expertUser.email,
          userPhone: expertUser.phone,
          hubName: clientHubName,
          hoursWorked: timelog.hoursWorked,
          contractTitle: contract.contractTitle,
        },
      });
    } catch (error) {
      console.error('Failed to send timelog approved notification:', error);
    }
  }

  /**
   * Notify expert that timelog was rejected
   * Note: hubId is set to expertHubId so expert sees this in THEIR hub dashboard
   */
  async notifyTimelogRejected(timelogId: string, rejectReason?: string): Promise<void> {
    try {
      const timelog = await TimelogEntry.findById(timelogId).lean();
      if (!timelog) return;

      const contract = await Contract.findById(timelog.contractId)
        .populate('clientHubId', 'name')
        .populate('expertHubId', 'name')
        .lean();

      if (!contract) return;

      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const clientHubName = clientHub?.name || 'The client';
      const expertHubId = this.getIdString(contract.expertHubId);
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());

      if (!expertUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.TIMELOG_REJECTED,
        user: expertUser,
        hubId: expertHubId,
        data: {
          userName: expertUser.name,
          userEmail: expertUser.email,
          userPhone: expertUser.phone,
          hubName: clientHubName,
          hoursWorked: timelog.hoursWorked,
          rejectReason: rejectReason || '',
          contractTitle: contract.contractTitle,
        },
      });
    } catch (error) {
      console.error('Failed to send timelog rejected notification:', error);
    }
  }

  /**
   * Notify the other party that contract was cancelled
   * Note: Expert gets expertHubId, client gets clientHubId
   */
  async notifyContractCancelled(
    contractId: string,
    cancelledBy: 'client' | 'expert',
    cancellationReason?: string,
  ): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('asssignedExpertId', 'name')
        .populate('clientHubId', 'name')
        .populate('expertHubId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientHubName = clientHub?.name || 'The client';

      if (cancelledBy === 'client') {
        // Notify expert (use expertHubId)
        const expertUser = await this.getUserData(contract.asssignedExpertId.toString());
        if (expertUser) {
          await communicationTriggerService.triggerCommunicationWithUser({
            templateId: ContractNotificationTemplate.CONTRACT_CANCELLED_EXPERT,
            user: expertUser,
            hubId: this.getIdString(contract.expertHubId),
            data: {
              userName: expertUser.name,
              userEmail: expertUser.email,
              userPhone: expertUser.phone,
              hubName: clientHubName,
              contractTitle: contract.contractTitle,
              cancellationReason: cancellationReason || '',
            },
          });
        }
      } else {
        // Notify client
        const clientUser = await this.getUserData(contract.createdBy.toString());
        if (clientUser) {
          await communicationTriggerService.triggerCommunicationWithUser({
            templateId: ContractNotificationTemplate.CONTRACT_CANCELLED_CLIENT,
            user: clientUser,
            hubId: this.getIdString(contract.clientHubId),
            data: {
              userName: clientUser.name,
              userEmail: clientUser.email,
              userPhone: clientUser.phone,
              expertName,
              contractTitle: contract.contractTitle,
              cancellationReason: cancellationReason || '',
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to send contract cancelled notification:', error);
    }
  }

  /**
   * Notify expert about weekly payout processed
   */
  async notifyWeeklyPayoutProcessed(
    expertId: string,
    contractTitle: string,
    amount: number,
    hours: number,
  ): Promise<void> {
    try {
      const expertUser = await this.getUserData(expertId);
      if (!expertUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.WEEKLY_PAYOUT_PROCESSED,
        user: expertUser,
        data: {
          userName: expertUser.name,
          userEmail: expertUser.email,
          userPhone: expertUser.phone,
          currency: '$',
          amount: amount.toFixed(2),
          hoursWorked: hours,
          contractTitle,
        },
      });
    } catch (error) {
      console.error('Failed to send weekly payout processed notification:', error);
    }
  }

  /**
   * Notify client about failed payment
   */
  async notifyWeeklyPayoutFailed(
    clientId: string,
    contractTitle: string,
    amount: number,
    errorMessage: string,
  ): Promise<void> {
    try {
      const clientUser = await this.getUserData(clientId);
      if (!clientUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.WEEKLY_PAYOUT_FAILED,
        user: clientUser,
        data: {
          userName: clientUser.name,
          userEmail: clientUser.email,
          userPhone: clientUser.phone,
          currency: '$',
          amount: amount.toFixed(2),
          contractTitle,
          errorMessage,
        },
      });
    } catch (error) {
      console.error('Failed to send weekly payout failed notification:', error);
    }
  }

  /**
   * Notify both parties that contract was completed
   */
  async notifyContractCompleted(contractId: string): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('asssignedExpertId', 'name')
        .populate('clientHubId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientHubName = clientHub?.name || 'The client';

      // Notify expert
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());
      if (expertUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.CONTRACT_COMPLETED,
          user: expertUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: expertUser.name,
            userEmail: expertUser.email,
            userPhone: expertUser.phone,
            hubName: clientHubName,
            contractTitle: contract.contractTitle,
            completionSummary: `Contract completed with ${clientHubName}.`,
          },
        });
      }

      // Notify client
      const clientUser = await this.getUserData(contract.createdBy.toString());
      if (clientUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.CONTRACT_COMPLETED,
          user: clientUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: clientUser.name,
            userEmail: clientUser.email,
            userPhone: clientUser.phone,
            expertName,
            contractTitle: contract.contractTitle,
            completionSummary: `Contract completed with ${expertName}.`,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send contract completed notification:', error);
    }
  }

  /**
   * Notify both parties that contract was created
   */
  async notifyContractCreated(contractId: string): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('asssignedExpertId', 'name')
        .populate('clientHubId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientHubName = clientHub?.name || 'The client';

      // Notify expert
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());
      if (expertUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.CONTRACT_CREATED,
          user: expertUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: expertUser.name,
            hubName: clientHubName,
            contractTitle: contract.contractTitle,
            contractId,
            priceType: contract.priceType,
          },
        });
      }

      // Notify client
      const clientUser = await this.getUserData(contract.createdBy.toString());
      if (clientUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.CONTRACT_CREATED,
          user: clientUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: clientUser.name,
            expertName,
            contractTitle: contract.contractTitle,
            contractId,
            priceType: contract.priceType,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send contract created notification:', error);
    }
  }

  /**
   * Notify both parties that contract was paused
   */
  async notifyContractPaused(contractId: string, pausedBy: 'client' | 'expert'): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('asssignedExpertId', 'name')
        .populate('clientHubId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientHubName = clientHub?.name || 'The client';

      // Notify expert
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());
      if (expertUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.CONTRACT_PAUSED,
          user: expertUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: expertUser.name,
            hubName: clientHubName,
            contractTitle: contract.contractTitle,
            contractId,
            pausedBy: pausedBy === 'client' ? clientHubName : expertName,
          },
        });
      }

      // Notify client
      const clientUser = await this.getUserData(contract.createdBy.toString());
      if (clientUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.CONTRACT_PAUSED,
          user: clientUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: clientUser.name,
            expertName,
            contractTitle: contract.contractTitle,
            contractId,
            pausedBy: pausedBy === 'client' ? clientHubName : expertName,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send contract paused notification:', error);
    }
  }

  /**
   * Notify both parties that contract was resumed
   */
  async notifyContractResumed(contractId: string): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('asssignedExpertId', 'name')
        .populate('clientHubId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientHubName = clientHub?.name || 'The client';

      // Notify expert
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());
      if (expertUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.CONTRACT_RESUMED,
          user: expertUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: expertUser.name,
            hubName: clientHubName,
            contractTitle: contract.contractTitle,
            contractId,
          },
        });
      }

      // Notify client
      const clientUser = await this.getUserData(contract.createdBy.toString());
      if (clientUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.CONTRACT_RESUMED,
          user: clientUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: clientUser.name,
            expertName,
            contractTitle: contract.contractTitle,
            contractId,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send contract resumed notification:', error);
    }
  }

  /**
   * Notify the other party that terms update was requested
   */
  async notifyTermsUpdateRequested(
    contractId: string,
    requestedBy: 'client' | 'expert',
    proposedChanges: string,
  ): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('asssignedExpertId', 'name')
        .populate('clientHubId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientHubName = clientHub?.name || 'The client';

      if (requestedBy === 'client') {
        // Notify expert
        const expertUser = await this.getUserData(contract.asssignedExpertId.toString());
        if (expertUser) {
          await communicationTriggerService.triggerCommunicationWithUser({
            templateId: ContractNotificationTemplate.TERMS_UPDATE_REQUESTED,
            user: expertUser,
            hubId: this.getIdString(contract.clientHubId),
            data: {
              userName: expertUser.name,
              hubName: clientHubName,
              contractTitle: contract.contractTitle,
              contractId,
              requestedBy: clientHubName,
              proposedChanges,
            },
          });
        }
      } else {
        // Notify client
        const clientUser = await this.getUserData(contract.createdBy.toString());
        if (clientUser) {
          await communicationTriggerService.triggerCommunicationWithUser({
            templateId: ContractNotificationTemplate.TERMS_UPDATE_REQUESTED,
            user: clientUser,
            hubId: this.getIdString(contract.clientHubId),
            data: {
              userName: clientUser.name,
              expertName,
              contractTitle: contract.contractTitle,
              contractId,
              requestedBy: expertName,
              proposedChanges,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to send terms update requested notification:', error);
    }
  }

  /**
   * Notify both parties that terms update was applied
   */
  async notifyTermsUpdateApplied(contractId: string): Promise<void> {
    try {
      const contract = await Contract.findById(contractId)
        .populate('asssignedExpertId', 'name')
        .populate('clientHubId', 'name')
        .lean();

      if (!contract) return;

      const expert = contract.asssignedExpertId as { name?: string } | undefined;
      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const expertName = expert?.name || 'The expert';
      const clientHubName = clientHub?.name || 'The client';

      // Notify expert
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());
      if (expertUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.TERMS_UPDATE_APPLIED,
          user: expertUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: expertUser.name,
            hubName: clientHubName,
            contractTitle: contract.contractTitle,
            contractId,
          },
        });
      }

      // Notify client
      const clientUser = await this.getUserData(contract.createdBy.toString());
      if (clientUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.TERMS_UPDATE_APPLIED,
          user: clientUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: clientUser.name,
            expertName,
            contractTitle: contract.contractTitle,
            contractId,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send terms update applied notification:', error);
    }
  }

  /**
   * Notify expert that milestone was funded by client
   */
  async notifyMilestoneFunded(milestoneId: string): Promise<void> {
    try {
      const milestone = await Milestone.findById(milestoneId).lean();
      if (!milestone) return;

      const contract = await Contract.findById(milestone.contractId)
        .populate('clientHubId', 'name')
        .lean();

      if (!contract) return;

      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const clientHubName = clientHub?.name || 'The client';
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());

      if (!expertUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.MILESTONE_FUNDED,
        user: expertUser,
        hubId: this.getIdString(contract.clientHubId),
        data: {
          userName: expertUser.name,
          hubName: clientHubName,
          milestoneName: milestone.taskName,
          amount: milestone.amount || 0,
          currency: '$',
          contractTitle: contract.contractTitle,
          contractId: contract._id?.toString(),
          milestoneId,
        },
      });
    } catch (error) {
      console.error('Failed to send milestone funded notification:', error);
    }
  }

  /**
   * Notify expert that timelog payment was received
   */
  async notifyTimelogPaymentReceived(
    timelogId: string,
    amount: number,
    currency: string = '$',
  ): Promise<void> {
    try {
      const timelog = await TimelogEntry.findById(timelogId).lean();
      if (!timelog) return;

      const contract = await Contract.findById(timelog.contractId)
        .populate('clientHubId', 'name')
        .lean();

      if (!contract) return;

      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const clientHubName = clientHub?.name || 'The client';
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());

      if (!expertUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.TIMELOG_PAYMENT_RECEIVED,
        user: expertUser,
        hubId: this.getIdString(contract.clientHubId),
        data: {
          userName: expertUser.name,
          hubName: clientHubName,
          hoursWorked: timelog.hoursWorked,
          amount,
          currency,
          contractTitle: contract.contractTitle,
        },
      });
    } catch (error) {
      console.error('Failed to send timelog payment received notification:', error);
    }
  }

  /**
   * Notify client that milestone funding failed
   */
  async notifyMilestoneFundingFailed(
    milestoneId: string,
    amount: number,
    errorMessage: string,
  ): Promise<void> {
    try {
      const milestone = await Milestone.findById(milestoneId).lean();
      if (!milestone) return;

      const contract = await Contract.findById(milestone.contractId).lean();
      if (!contract) return;

      const clientUser = await this.getUserData(contract.createdBy.toString());
      if (!clientUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.MILESTONE_FUNDING_FAILED,
        user: clientUser,
        hubId: this.getIdString(contract.clientHubId),
        data: {
          userName: clientUser.name,
          userEmail: clientUser.email,
          userPhone: clientUser.phone,
          milestoneName: milestone.taskName,
          amount: amount.toFixed(2),
          currency: '$',
          contractTitle: contract.contractTitle,
          contractId: contract._id?.toString(),
          errorMessage,
        },
      });
    } catch (error) {
      console.error('Failed to send milestone funding failed notification:', error);
    }
  }

  /**
   * Notify both parties that milestone release/transfer failed
   * Expert is notified about delayed payment, client about failed transfer
   */
  async notifyMilestoneReleaseFailed(
    milestoneId: string,
    amount: number,
    errorMessage: string,
  ): Promise<void> {
    try {
      const milestone = await Milestone.findById(milestoneId).lean();
      if (!milestone) return;

      const contract = await Contract.findById(milestone.contractId)
        .populate('clientHubId', 'name')
        .populate('expertHubId', 'name')
        .lean();

      if (!contract) return;

      const clientHub = contract.clientHubId as { name?: string } | undefined;
      const clientHubName = clientHub?.name || 'The client';

      // Notify expert about delayed payment
      const expertUser = await this.getUserData(contract.asssignedExpertId.toString());
      if (expertUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.MILESTONE_RELEASE_FAILED,
          user: expertUser,
          hubId: this.getIdString(contract.expertHubId),
          data: {
            userName: expertUser.name,
            userEmail: expertUser.email,
            userPhone: expertUser.phone,
            hubName: clientHubName,
            milestoneName: milestone.taskName,
            amount: amount.toFixed(2),
            currency: '$',
            contractTitle: contract.contractTitle,
            errorMessage: 'Your payment is being processed and may be delayed.',
          },
        });
      }

      // Notify client about transfer failure
      const clientUser = await this.getUserData(contract.createdBy.toString());
      if (clientUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.MILESTONE_RELEASE_FAILED,
          user: clientUser,
          hubId: this.getIdString(contract.clientHubId),
          data: {
            userName: clientUser.name,
            userEmail: clientUser.email,
            userPhone: clientUser.phone,
            milestoneName: milestone.taskName,
            amount: amount.toFixed(2),
            currency: '$',
            contractTitle: contract.contractTitle,
            errorMessage,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send milestone release failed notification:', error);
    }
  }

  /**
   * Notify client that payment retry failed (not permanently)
   */
  async notifyPaymentRetryFailed(
    clientId: string,
    contractTitle: string,
    amount: number,
    retryCount: number,
    maxRetries: number,
    errorMessage: string,
    hubId?: string,
  ): Promise<void> {
    try {
      const clientUser = await this.getUserData(clientId);
      if (!clientUser) return;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: ContractNotificationTemplate.PAYMENT_RETRY_FAILED,
        user: clientUser,
        hubId,
        data: {
          userName: clientUser.name,
          userEmail: clientUser.email,
          userPhone: clientUser.phone,
          currency: '$',
          amount: amount.toFixed(2),
          contractTitle,
          retryCount: String(retryCount),
          maxRetries: String(maxRetries),
          errorMessage,
        },
      });
    } catch (error) {
      console.error('Failed to send payment retry failed notification:', error);
    }
  }

  /**
   * Notify both client and expert that payment permanently failed after max retries
   */
  async notifyPaymentPermanentlyFailed(
    clientId: string,
    expertId: string,
    contractTitle: string,
    amount: number,
    errorMessage: string,
    clientHubId?: string,
    expertHubId?: string,
  ): Promise<void> {
    try {
      // Notify client - needs to update payment method
      const clientUser = await this.getUserData(clientId);
      if (clientUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.PAYMENT_PERMANENTLY_FAILED,
          user: clientUser,
          hubId: clientHubId,
          data: {
            userName: clientUser.name,
            userEmail: clientUser.email,
            userPhone: clientUser.phone,
            currency: '$',
            amount: amount.toFixed(2),
            contractTitle,
            errorMessage,
            actionRequired: 'Please update your payment method to resume work.',
          },
        });
      }

      // Notify expert - work may be affected
      const expertUser = await this.getUserData(expertId);
      if (expertUser) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: ContractNotificationTemplate.PAYMENT_PERMANENTLY_FAILED,
          user: expertUser,
          hubId: expertHubId,
          data: {
            userName: expertUser.name,
            userEmail: expertUser.email,
            userPhone: expertUser.phone,
            currency: '$',
            amount: amount.toFixed(2),
            contractTitle,
            errorMessage: 'Payment from client has failed. The client has been notified.',
            actionRequired: 'Payment processing is delayed. We are working to resolve this.',
          },
        });
      }
    } catch (error) {
      console.error('Failed to send payment permanently failed notification:', error);
    }
  }
}

export const hubContractNotificationService = new HubContractNotificationService();
