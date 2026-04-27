import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  ProposalCheckoutData,
  ProposalSuccessData,
  SubmitProposalRequest,
  SubmitProposalResponse as SubmitProposalResult,
} from '../../features/proposal/models';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Checkout Data Types
// ============================================================================

export interface CheckoutTicket {
  ticketId: string;
  ticketName: string;
  ticketType: 'paid' | 'free';
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CheckoutPricing {
  currency: string;
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  isHubPayingFee: boolean;
}

export interface CheckoutHub {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface CheckoutHost {
  _id: string;
  name: string;
  photoUrl?: string;
}

export interface CheckoutQuestion {
  questionLabel: string;
  questionType: 'text' | 'dropdown' | 'checkbox' | 'multiple_choice';
  dropDown?: string[];
  checkBox?: string[];
  multipleChoices?: string[];
}

export interface CheckoutQuestionnaire {
  isQuestionMandatory: boolean;
  questionArray: CheckoutQuestion[];
}

// ============================================================================
// Experience Checkout Types
// ============================================================================

export interface ExperienceCheckoutData {
  holdId: string;
  holdExpiresAt: string;
  // Stripe Payment Element fields
  clientSecret?: string;
  paymentIntentId?: string;
  // Multi-region Stripe fields
  stripePublishableKey?: string;
  stripeRegion?: 'malaysia' | 'atlas';
  experience: {
    _id: string;
    title: string;
    slug: string;
    coverPhoto?: string;
    experienceType: 'Physical' | 'Virtual' | 'Hybrid';
    hub: CheckoutHub;
  };
  event: {
    _id: string;
    startTime: string;
    endTime: string;
    timeZone: string;
  };
  tickets: CheckoutTicket[];
  pricing: CheckoutPricing;
  questionnaire: CheckoutQuestionnaire | null;
}

export interface InitExperienceCheckoutRequest {
  experienceSlug: string;
  eventId: string;
  tickets: Array<{ ticketId: string; quantity: number }>;
}

// ============================================================================
// Expertise Checkout Types
// ============================================================================

export interface ExpertiseCheckoutData {
  holdId: string;
  holdExpiresAt: string;
  // Stripe Payment Element fields
  clientSecret?: string;
  paymentIntentId?: string;
  // Multi-region Stripe fields
  stripePublishableKey?: string;
  stripeRegion?: 'malaysia' | 'atlas';
  expertise: {
    _id: string;
    title: string;
    slug: string;
    coverPhoto?: string;
    expertiseType: 'Online' | 'Physical' | 'Hybrid';
    host: CheckoutHost;
    hub: CheckoutHub;
  };
  ticket: {
    ticketId: string;
    ticketName: string;
    ticketType: 'paid' | 'free';
    unitPrice: number;
    sessionDuration: number;
    durationUnit: string;
    mode: string;
  };
  session: {
    date: string;
    startTime: string;
    endTime: string;
  };
  pricing: CheckoutPricing;
  questionnaire: CheckoutQuestionnaire | null;
  instantBooking: boolean;
}

export interface InitExpertiseCheckoutRequest {
  expertiseSlug: string;
  ticketId: string;
  date: string;
  time: string;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface LearnerInfo {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

export interface ProcessExperiencePaymentRequest {
  holdId?: string; // Optional for guest checkout
  // Alternative fields for guest checkout (when no holdId)
  experienceId?: string;
  eventId?: string;
  tickets?: Array<{ ticketId: string; quantity: number }>;
  // Legacy Card Element flow
  paymentMethodId?: string;
  // New Payment Element flow - payment confirmed client-side
  paymentIntentId?: string;
  learners: LearnerInfo[];
  questionnaire?: Array<{ questionLabel: string; answer: string | string[] }>;
  couponCode?: string;
}

export interface ProcessExpertisePaymentRequest {
  expertiseId: string;
  ticketId: string;
  date: string;
  time: string;
  paymentMethodId: string;
  learner: LearnerInfo;
  questionnaire?: Array<{ questionLabel: string; answer: string | string[] }>;
  couponCode?: string;
}

export interface PaymentResult {
  bookingId: string;
  bookingReference: string;
  status?: 'ACTIVE' | 'PENDING';
}

// ============================================================================
// Coupon Types
// ============================================================================

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  couponType?: 'mereka' | 'hub';
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discount?: number;
  message: string;
}

export interface ValidateCouponRequest {
  code: string;
  serviceType: 'experience' | 'expertise';
  serviceId: string;
  amount: number;
}

// ============================================================================
// Hold Management Types
// ============================================================================

export interface ExtendHoldResult {
  success: boolean;
  expiresAt: string;
}

// ============================================================================
// Experience Slots Types (for Step 1)
// ============================================================================

export interface ExperienceSlotTicket {
  id: string;
  name: string;
  price: number;
  type: 'Paid' | 'Free';
  description?: string;
  maximumQuantity: number;
  availableQuantity: number;
  ticketSalePeriodEndTime?: string;
}

export interface ExperienceSlot {
  id: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  tickets: ExperienceSlotTicket[];
  totalAvailableQuantity: number;
}

export interface ExperienceSlotsData {
  slots: ExperienceSlot[];
  currency: string;
  minPrice: number;
  isHubPayingFee: boolean;
}

export interface ExperienceBasicInfo {
  _id: string;
  experienceTitle: string;
  slug: string;
  coverPhoto?: string;
  experienceType: string;
  experienceDuration?: number;
  hub?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  };
}

// ============================================================================
// Expertise Slots Types (for Step 1)
// ============================================================================

export interface ExpertiseTicketInfo {
  id: string;
  name: string;
  price: number;
  type: 'Paid' | 'Free';
  description?: string;
  mode: string;
  sessionDuration: number;
  durationUnit: string;
  bufferTime?: number;
  instantBooking: boolean;
}

export interface ExpertiseTimeSlot {
  time: string; // HH:mm format
  available: boolean;
}

export interface ExpertiseDateSlots {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  slots: ExpertiseTimeSlot[];
}

export interface ExpertiseSlotsData {
  expertise: {
    _id: string;
    expertiseTitle: string;
    slug: string;
    coverPhoto?: string;
    host?: {
      id: string;
      name: string;
      profileUrl?: string;
    };
    hub: {
      _id: string;
      name: string;
      slug: string;
      logo?: string;
    };
  };
  tickets: ExpertiseTicketInfo[];
  currency: string;
  minPrice: number;
  isHubPayingFee: boolean;
  availableDates: ExpertiseDateSlots[];
}

// ============================================================================
// Checkout API Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/checkout`;

  // =========================================================================
  // Experience Checkout
  // =========================================================================

  /**
   * Initialize experience checkout - creates slot hold
   */
  async initExperienceCheckout(
    request: InitExperienceCheckoutRequest
  ): Promise<ExperienceCheckoutData> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<ExperienceCheckoutData>>(
        `${this.apiUrl}/experience/init`,
        request,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to initialize checkout');
    }

    return response.data;
  }

  /**
   * Process experience payment
   */
  async processExperiencePayment(
    request: ProcessExperiencePaymentRequest
  ): Promise<PaymentResult> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<PaymentResult>>(
        `${this.apiUrl}/experience/pay`,
        request,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Payment failed');
    }

    return response.data;
  }

  /**
   * Process free experience checkout
   */
  async processExperienceFreeCheckout(
    request: Omit<ProcessExperiencePaymentRequest, 'paymentMethodId'>
  ): Promise<PaymentResult> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<PaymentResult>>(
        `${this.apiUrl}/experience/free`,
        request,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Checkout failed');
    }

    return response.data;
  }

  // =========================================================================
  // Expertise Checkout
  // =========================================================================

  /**
   * Initialize expertise checkout
   */
  async initExpertiseCheckout(
    request: InitExpertiseCheckoutRequest
  ): Promise<ExpertiseCheckoutData> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<ExpertiseCheckoutData>>(
        `${this.apiUrl}/expertise/init`,
        request,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to initialize checkout');
    }

    return response.data;
  }

  /**
   * Process expertise payment
   */
  async processExpertisePayment(
    request: ProcessExpertisePaymentRequest
  ): Promise<PaymentResult> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<PaymentResult>>(
        `${this.apiUrl}/expertise/pay`,
        request,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Payment failed');
    }

    return response.data;
  }

  /**
   * Process free expertise checkout
   */
  async processExpertiseFreeCheckout(
    request: Omit<ProcessExpertisePaymentRequest, 'paymentMethodId'>
  ): Promise<PaymentResult> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<PaymentResult>>(
        `${this.apiUrl}/expertise/free`,
        request,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Checkout failed');
    }

    return response.data;
  }

  // =========================================================================
  // Coupon Validation
  // =========================================================================

  /**
   * Validate coupon code
   */
  async validateCoupon(request: ValidateCouponRequest): Promise<CouponValidationResult> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<CouponValidationResult>>(
        `${this.apiUrl}/validate-coupon`,
        request,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      return {
        valid: false,
        message: response.error?.message || 'Invalid coupon',
      };
    }

    return response.data;
  }

  // =========================================================================
  // Hold Management
  // =========================================================================

  /**
   * Release slot hold
   */
  async releaseHold(holdId: string): Promise<void> {
    await firstValueFrom(
      this.http.post<ApiResponse<{ success: boolean }>>(
        `${this.apiUrl}/hold/release`,
        { holdId },
        { withCredentials: true }
      )
    );
  }

  /**
   * Extend slot hold
   */
  async extendHold(holdId: string): Promise<ExtendHoldResult> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<ExtendHoldResult>>(
        `${this.apiUrl}/hold/extend`,
        { holdId },
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to extend hold');
    }

    return response.data;
  }

  // =========================================================================
  // Experience Data (for Step 1)
  // =========================================================================

  /**
   * Get experience basic info by slug
   */
  async getExperienceBySlug(slug: string): Promise<ExperienceBasicInfo> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ExperienceBasicInfo>>(
        `${environment.apiUrl}/experiences/${slug}`,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Experience not found');
    }

    return response.data;
  }

  /**
   * Get experience slots with ticket availability
   */
  async getExperienceSlots(slug: string): Promise<ExperienceSlotsData> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ExperienceSlotsData>>(
        `${environment.apiUrl}/experiences/${slug}/slots`,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to load slots');
    }

    return response.data;
  }

  // =========================================================================
  // Expertise Data (for Step 1)
  // =========================================================================

  /**
   * Get expertise slots with available dates and times
   */
  async getExpertiseSlots(slug: string, ticketId?: string): Promise<ExpertiseSlotsData> {
    let url = `${environment.apiUrl}/expertises/${slug}/slots`;
    if (ticketId) {
      url += `?ticketId=${ticketId}`;
    }

    const response = await firstValueFrom(
      this.http.get<ApiResponse<ExpertiseSlotsData>>(url, { withCredentials: true })
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to load expertise slots');
    }

    return response.data;
  }

  // =========================================================================
  // Proposal Checkout
  // =========================================================================

  /**
   * Initialize proposal checkout - get job details and check for existing proposal
   */
  async getProposalCheckout(jobId: string): Promise<ProposalCheckoutData> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ProposalCheckoutData>>(
        `${this.apiUrl}/proposal/${jobId}`,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to load job details');
    }

    return response.data;
  }

  /**
   * Submit proposal
   */
  async submitProposal(
    data: SubmitProposalRequest
  ): Promise<SubmitProposalResult> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<SubmitProposalResult>>(
        `${this.apiUrl}/proposal`,
        data,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to submit proposal');
    }

    return response.data;
  }

  /**
   * Get proposal success details
   */
  async getProposalSuccess(proposalId: string): Promise<ProposalSuccessData> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<ProposalSuccessData>>(
        `${this.apiUrl}/proposal/success/${proposalId}`,
        { withCredentials: true }
      )
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to load proposal details');
    }

    return response.data;
  }
}
