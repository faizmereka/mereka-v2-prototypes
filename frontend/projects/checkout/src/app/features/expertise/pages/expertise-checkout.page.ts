import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import {
  StepProgressComponent,
  type CheckoutStep,
  BookerFormComponent,
  type BookerFormData,
  StripePaymentComponent,
  CouponInputComponent,
  type AppliedCoupon,
  QuestionnaireFormComponent,
  type QuestionnaireAnswer,
  ExpertiseTicketSelectorComponent,
  type SelectedExpertiseSlot,
  HoldTimerComponent,
} from '../../../shared/components';
import {
  CheckoutApiService,
  StripeService,
  AuthService,
  type ExpertiseCheckoutData,
  type ExpertiseSlotsData,
  type ExpertiseTicketInfo,
} from '../../../core/services';
import { calculatePricing } from '../../../core/utils';

@Component({
  selector: 'app-expertise-checkout-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StepProgressComponent,
    BookerFormComponent,
    StripePaymentComponent,
    CouponInputComponent,
    QuestionnaireFormComponent,
    ExpertiseTicketSelectorComponent,
    HoldTimerComponent,
  ],
  templateUrl: './expertise-checkout.page.html',
})
export class ExpertiseCheckoutPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly checkoutApi = inject(CheckoutApiService);
  private readonly stripeService = inject(StripeService);
  private readonly authService = inject(AuthService);

  // Step Management
  readonly currentStep = signal<CheckoutStep>(1);
  readonly completedSteps = signal<CheckoutStep[]>([]);

  // State
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly showErrors = signal(false);
  readonly couponLoading = signal(false);

  // Step 1 Data
  readonly expertiseSlug = signal<string>('');
  readonly slotsData = signal<ExpertiseSlotsData | null>(null);
  readonly selectedSlot = signal<SelectedExpertiseSlot | null>(null);

  // Checkout Data (after step 1 completion)
  readonly checkoutData = signal<ExpertiseCheckoutData | null>(null);

  // Form Data
  readonly bookerData = signal<BookerFormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+60',
  });
  readonly questionnaireAnswers = signal<QuestionnaireAnswer[]>([]);
  readonly appliedCoupon = signal<AppliedCoupon | null>(null);

  // Computed Values
  readonly expertiseInfo = computed(() => this.slotsData()?.expertise);
  readonly tickets = computed(() => this.slotsData()?.tickets || []);
  readonly availableDates = computed(() => this.slotsData()?.availableDates || []);

  readonly expertise = computed(() => this.checkoutData()?.expertise);
  readonly ticket = computed(() => this.checkoutData()?.ticket);
  readonly session = computed(() => this.checkoutData()?.session);
  readonly questionnaire = computed(() => this.checkoutData()?.questionnaire ?? null);
  readonly instantBooking = computed(() => this.checkoutData()?.instantBooking ?? true);

  readonly pricing = computed(() => {
    const data = this.checkoutData();
    if (!data) return null;

    const discount = this.appliedCoupon()?.discount || 0;
    return calculatePricing(
      data.pricing.subtotal,
      data.pricing.currency,
      data.pricing.isHubPayingFee,
      discount
    );
  });

  readonly step1Currency = computed(() => this.slotsData()?.currency || 'MYR');

  readonly sessionInfo = computed(() => {
    const s = this.session();
    if (!s) return '';

    const date = new Date(s.date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    return `${date.toLocaleDateString('en-US', options)} at ${s.startTime}`;
  });

  readonly isFreeCheckout = computed(() => {
    const p = this.pricing();
    return p?.total === 0;
  });

  readonly isLoggedIn = computed(() => {
    return this.authService.isLoggedIn();
  });

  readonly holdExpiresAt = computed(() => this.checkoutData()?.holdExpiresAt ?? null);

  readonly canContinueStep1 = computed(() => {
    return this.selectedSlot() !== null;
  });

  readonly canContinueStep2 = computed(() => {
    const data = this.bookerData();
    const emailValid = data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
    return data.name && emailValid && data.phone;
  });

  readonly canSubmit = computed(() => {
    // Check booker is valid
    if (!this.canContinueStep2()) return false;

    // Check questionnaire if mandatory
    const q = this.questionnaire();
    if (q?.isQuestionMandatory) {
      const allAnswered = this.questionnaireAnswers().every(
        (a) => a.answer && (typeof a.answer === 'string' ? a.answer : a.answer.length > 0)
      );
      if (!allAnswered) return false;
    }

    // For paid checkout, check Stripe is ready
    const stripeReady = this.isFreeCheckout() || this.stripeService.isReady();

    return stripeReady && !this.submitting();
  });

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Initialize auth (optional - user may be a guest)
    await this.authService.init();

    // Get URL params
    const slug = this.route.snapshot.paramMap.get('slug');
    const ticketId = this.route.snapshot.queryParamMap.get('ticket');
    const date = this.route.snapshot.queryParamMap.get('date');
    const time = this.route.snapshot.queryParamMap.get('time');

    if (!slug) {
      this.error.set('Invalid checkout URL');
      this.loading.set(false);
      return;
    }

    this.expertiseSlug.set(slug);

    // If ticket, date, and time are provided, skip to step 2 (or step 3 if user details are complete)
    if (ticketId && date && time) {
      try {
        await this.initCheckout(slug, ticketId, date, time);

        // Check if user is logged in and all booker details are filled
        if (this.isLoggedIn() && this.canContinueStep2()) {
          this.currentStep.set(3);
          this.completedSteps.set([1, 2]);
        } else {
          this.currentStep.set(2);
          this.completedSteps.set([1]);
        }
      } catch (err: any) {
        console.error('Checkout init error:', err);
        this.error.set(err.message || 'Failed to initialize checkout');
      }
    } else {
      // Load expertise details for step 1
      try {
        await this.loadExpertiseForStep1(slug);
      } catch (err: any) {
        console.error('Load expertise error:', err);
        this.error.set(err.message || 'Failed to load expertise');
      }
    }

    this.loading.set(false);
  }

  // =========================================================================
  // Step 1: Ticket & Slot Selection
  // =========================================================================

  async loadExpertiseForStep1(slug: string): Promise<void> {
    try {
      const slotsData = await this.checkoutApi.getExpertiseSlots(slug);
      this.slotsData.set(slotsData);

      if (slotsData.availableDates.length === 0) {
        this.error.set('This expertise is not available for booking. Please contact the host to set up their operating hours.');
      }
    } catch (err: any) {
      console.error('Load expertise error:', err);
      throw err;
    }
  }

  onSlotSelected(slot: SelectedExpertiseSlot | null): void {
    this.selectedSlot.set(slot);
  }

  onTicketChanged(ticket: ExpertiseTicketInfo): void {
    // When ticket changes, we might need to reload slots for that specific ticket
    // The backend slot generation depends on the ticket's session duration
    const slug = this.expertiseSlug();
    if (slug) {
      this.loadExpertiseForStep1(slug);
    }
  }

  async continueFromStep1(): Promise<void> {
    if (!this.canContinueStep1()) return;

    const slot = this.selectedSlot();
    if (!slot) return;

    try {
      this.loading.set(true);
      await this.initCheckout(this.expertiseSlug(), slot.ticketId, slot.date, slot.time);

      // Check if user is logged in and all booker details are filled
      if (this.isLoggedIn() && this.canContinueStep2()) {
        this.currentStep.set(3);
        this.completedSteps.set([1, 2]);
      } else {
        this.currentStep.set(2);
        this.completedSteps.set([1]);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to continue');
    } finally {
      this.loading.set(false);
    }
  }

  // =========================================================================
  // Step 2: Your Details
  // =========================================================================

  onBookerDataChange(data: BookerFormData): void {
    this.bookerData.set(data);
  }

  async onGoogleSignIn(): Promise<void> {
    // TODO: Implement Google sign-in
    console.log('Google sign-in clicked');
  }

  continueFromStep2(): void {
    this.showErrors.set(true);
    if (!this.canContinueStep2()) return;

    this.completedSteps.set([1, 2]);
    this.currentStep.set(3);
    this.showErrors.set(false);
  }

  // =========================================================================
  // Step 3: Payment
  // =========================================================================

  onQuestionnaireChange(answers: QuestionnaireAnswer[]): void {
    this.questionnaireAnswers.set(answers);
  }

  async onApplyCoupon(code: string): Promise<void> {
    const data = this.checkoutData();
    if (!data) return;

    this.couponLoading.set(true);

    try {
      const result = await this.checkoutApi.validateCoupon({
        code,
        serviceType: 'expertise',
        serviceId: data.expertise._id,
        amount: data.pricing.subtotal,
      });

      if (result.valid && result.discount !== undefined) {
        this.appliedCoupon.set({
          code,
          discount: result.discount,
          discountType: result.discountType!,
          discountValue: result.discountValue!,
          couponType: result.couponType!,
        });
      } else {
        this.appliedCoupon.set(null);
      }
    } catch (err) {
      console.error('Coupon validation error:', err);
    } finally {
      this.couponLoading.set(false);
    }
  }

  onRemoveCoupon(): void {
    this.appliedCoupon.set(null);
  }

  async changeSelection(): Promise<void> {
    // Load step 1 data if not already loaded (happens when user came via URL params)
    if (!this.slotsData()) {
      this.loading.set(true);
      try {
        await this.loadExpertiseForStep1(this.expertiseSlug());
      } catch (err: any) {
        console.error('Load expertise error:', err);
        this.error.set(err.message || 'Failed to load expertise');
      } finally {
        this.loading.set(false);
      }
    }
    // Go back to step 1
    this.currentStep.set(1);
  }

  async onSubmit(): Promise<void> {
    this.showErrors.set(true);

    if (!this.canSubmit()) {
      return;
    }

    const data = this.checkoutData();
    if (!data) {
      this.error.set('Checkout data not found');
      return;
    }

    const booker = this.bookerData();
    this.submitting.set(true);

    try {
      if (this.isFreeCheckout()) {
        // Free checkout
        const result = await this.checkoutApi.processExpertiseFreeCheckout({
          expertiseId: data.expertise._id,
          ticketId: data.ticket.ticketId,
          date: data.session.date,
          time: data.session.startTime,
          learner: {
            name: booker.name,
            email: booker.email,
            phone: booker.countryCode + booker.phone,
            countryCode: booker.countryCode,
          },
          questionnaire: this.questionnaireAnswers(),
          couponCode: this.appliedCoupon()?.code,
        });

        this.router.navigate(['/success', result.bookingId]);
      } else {
        // Paid checkout
        const user = this.authService.user();
        const paymentResult = await this.stripeService.createPaymentMethod({
          name: booker.name,
          email: user?.email || booker.email,
        });

        if (paymentResult.error) {
          throw new Error(paymentResult.error.message);
        }

        const result = await this.checkoutApi.processExpertisePayment({
          expertiseId: data.expertise._id,
          ticketId: data.ticket.ticketId,
          date: data.session.date,
          time: data.session.startTime,
          paymentMethodId: paymentResult.paymentMethod!.id,
          learner: {
            name: booker.name,
            email: booker.email,
            phone: booker.countryCode + booker.phone,
            countryCode: booker.countryCode,
          },
          questionnaire: this.questionnaireAnswers(),
          couponCode: this.appliedCoupon()?.code,
        });

        this.router.navigate(['/success', result.bookingId]);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      this.error.set(err.message || 'Payment failed');
      this.submitting.set(false);
    }
  }

  onHoldExpired(): void {
    this.router.navigate(['/expired']);
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private async initCheckout(
    slug: string,
    ticketId: string,
    date: string,
    time: string
  ): Promise<void> {
    const data = await this.checkoutApi.initExpertiseCheckout({
      expertiseSlug: slug,
      ticketId,
      date,
      time,
    });

    this.checkoutData.set(data);

    // Pre-fill booker from logged-in user if available
    const user = this.authService.user();
    if (user) {
      // Parse phone number - remove country code prefix if present
      let phone = user.phoneNumber || '';
      let countryCode = user.countryCode || '+60';

      // If phone starts with country code, extract it
      if (phone && !user.countryCode) {
        const phonePrefixes = ['+60', '+65', '+1', '+44', '+91', '+86', '+977'];
        for (const prefix of phonePrefixes) {
          if (phone.startsWith(prefix)) {
            countryCode = prefix;
            phone = phone.substring(prefix.length);
            break;
          }
        }
      }

      this.bookerData.set({
        name: user.name || '',
        email: user.email || '',
        phone,
        countryCode,
      });
    }
  }
}
