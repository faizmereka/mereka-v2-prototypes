import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
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
  SlotTicketSelectorComponent,
  type SelectedTicket,
  HoldTimerComponent,
} from '../../../shared/components';
import {
  CheckoutApiService,
  StripeService,
  AuthService,
  type ExperienceCheckoutData,
  type ExperienceSlot,
  type ExperienceSlotsData,
  type ExperienceBasicInfo,
} from '../../../core/services';
import { calculatePricing } from '../../../core/utils';

@Component({
  selector: 'app-experience-checkout-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StepProgressComponent,
    BookerFormComponent,
    StripePaymentComponent,
    CouponInputComponent,
    QuestionnaireFormComponent,
    SlotTicketSelectorComponent,
    HoldTimerComponent,
  ],
  templateUrl: './experience-checkout.page.html',
})
export class ExperienceCheckoutPage implements OnInit, OnDestroy {
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
  readonly experienceSlug = signal<string>('');
  readonly experienceInfo = signal<ExperienceBasicInfo | null>(null);
  readonly slotsData = signal<ExperienceSlotsData | null>(null);
  readonly selectedSlot = signal<ExperienceSlot | null>(null);
  readonly selectedTickets = signal<SelectedTicket[]>([]);

  // Checkout Data (after step 1 completion)
  readonly checkoutData = signal<ExperienceCheckoutData | null>(null);

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
  readonly experience = computed(() => this.checkoutData()?.experience);
  readonly event = computed(() => this.checkoutData()?.event);
  readonly tickets = computed(() => this.checkoutData()?.tickets || []);
  readonly questionnaire = computed(() => this.checkoutData()?.questionnaire ?? null);
  readonly holdExpiresAt = computed(() => this.checkoutData()?.holdExpiresAt ?? null);
  readonly holdId = computed(() => this.checkoutData()?.holdId);

  readonly totalTickets = computed(() =>
    this.tickets().reduce((sum, t) => sum + t.quantity, 0)
  );

  readonly totalSelectedTickets = computed(() =>
    this.selectedTickets().reduce((sum, t) => sum + t.quantity, 0)
  );

  readonly step1Subtotal = computed(() =>
    this.selectedTickets().reduce((sum, t) => sum + t.unitPrice * t.quantity, 0)
  );

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

  readonly isFreeCheckout = computed(() => {
    const p = this.pricing();
    return p?.total === 0;
  });

  readonly isLoggedIn = computed(() => {
    return this.authService.isLoggedIn();
  });

  readonly canContinueStep1 = computed(() => {
    return this.selectedSlot() !== null && this.totalSelectedTickets() > 0;
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
    const eventId = this.route.snapshot.queryParamMap.get('slot'); // slot param contains eventId
    const ticketsParam = this.route.snapshot.queryParamMap.get('tickets');

    if (!slug) {
      this.error.set('Invalid checkout URL');
      this.loading.set(false);
      return;
    }

    this.experienceSlug.set(slug);

    // If slot and tickets are provided, skip to step 2 (or step 3 if user details are complete)
    if (eventId && ticketsParam) {
      try {
        const tickets = this.parseTickets(ticketsParam);
        await this.initCheckout(slug, eventId, tickets);

        // Check if user is logged in and all booker details are filled
        // If so, skip directly to step 3 (payment)
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
      // Load experience details for step 1
      try {
        await this.loadExperienceForStep1(slug);
      } catch (err: any) {
        console.error('Load experience error:', err);
        this.error.set(err.message || 'Failed to load experience');
      }
    }

    this.loading.set(false);
  }

  ngOnDestroy(): void {
    // Release hold on unmount (if user navigates away)
    const holdId = this.holdId();
    if (holdId && !this.submitting()) {
      this.checkoutApi.releaseHold(holdId).catch(() => {
        // Ignore errors - hold will expire anyway
      });
    }
  }

  // =========================================================================
  // Step 1: Slot & Ticket Selection
  // =========================================================================

  async loadExperienceForStep1(slug: string): Promise<void> {
    try {
      // Fetch experience info and slots in parallel
      const [experienceInfo, slotsData] = await Promise.all([
        this.checkoutApi.getExperienceBySlug(slug),
        this.checkoutApi.getExperienceSlots(slug),
      ]);

      this.experienceInfo.set(experienceInfo);
      this.slotsData.set(slotsData);

      if (slotsData.slots.length === 0) {
        this.error.set('No available slots for this experience');
      }
    } catch (err: any) {
      console.error('Load experience error:', err);
      throw err;
    }
  }

  onSlotSelected(slot: ExperienceSlot): void {
    this.selectedSlot.set(slot);
    this.selectedTickets.set([]);
  }

  onTicketsSelected(tickets: SelectedTicket[]): void {
    this.selectedTickets.set(tickets);
  }

  async continueFromStep1(): Promise<void> {
    if (!this.canContinueStep1()) return;

    const slot = this.selectedSlot();
    if (!slot) return;

    const tickets = this.selectedTickets().map((t) => ({
      ticketId: t.ticketId,
      quantity: t.quantity,
    }));

    try {
      this.loading.set(true);
      await this.initCheckout(this.experienceSlug(), slot.id, tickets);

      // Check if user is logged in and all booker details are filled
      // If so, skip directly to step 3 (payment)
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
        serviceType: 'experience',
        serviceId: data.experience._id,
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
    if (!this.experienceInfo() || !this.slotsData()) {
      this.loading.set(true);
      try {
        await this.loadExperienceForStep1(this.experienceSlug());
      } catch (err: any) {
        console.error('Load experience error:', err);
        this.error.set(err.message || 'Failed to load experience');
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

    const holdId = this.holdId() || '';
    const booker = this.bookerData();

    this.submitting.set(true);

    try {
      if (this.isFreeCheckout()) {
        // Free checkout
        const result = await this.checkoutApi.processExperienceFreeCheckout({
          holdId,
          learners: [{
            name: booker.name,
            email: booker.email,
            phone: booker.countryCode + booker.phone,
            countryCode: booker.countryCode,
          }],
          questionnaire: this.questionnaireAnswers(),
          couponCode: this.appliedCoupon()?.code,
        });

        this.router.navigate(['/success', result.bookingId]);
      } else if (this.stripeService.hasPaymentElement()) {
        // New Payment Element flow - confirm payment directly with Stripe
        const returnUrl = `${window.location.origin}/success`;
        const paymentResult = await this.stripeService.confirmPayment(returnUrl);

        if (paymentResult.error) {
          throw new Error(paymentResult.error.message);
        }

        // Payment confirmed - now process booking on backend with PaymentIntent ID
        const result = await this.checkoutApi.processExperiencePayment({
          holdId,
          paymentIntentId: paymentResult.paymentIntent?.id || '',
          learners: [{
            name: booker.name,
            email: booker.email,
            phone: booker.countryCode + booker.phone,
            countryCode: booker.countryCode,
          }],
          questionnaire: this.questionnaireAnswers(),
          couponCode: this.appliedCoupon()?.code,
        });

        this.router.navigate(['/success', result.bookingId]);
      } else {
        // Legacy Card Element flow
        const user = this.authService.user();
        const paymentResult = await this.stripeService.createPaymentMethod({
          name: booker.name,
          email: user?.email || booker.email,
        });

        if (paymentResult.error) {
          throw new Error(paymentResult.error.message);
        }

        const result = await this.checkoutApi.processExperiencePayment({
          holdId,
          paymentMethodId: paymentResult.paymentMethod!.id,
          learners: [{
            name: booker.name,
            email: booker.email,
            phone: booker.countryCode + booker.phone,
            countryCode: booker.countryCode,
          }],
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
    eventId: string,
    tickets: Array<{ ticketId: string; quantity: number }>
  ): Promise<void> {
    const data = await this.checkoutApi.initExperienceCheckout({
      experienceSlug: slug,
      eventId,
      tickets,
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

  private parseTickets(param: string): Array<{ ticketId: string; quantity: number }> {
    try {
      // Try base64 decode first
      const decoded = atob(param);
      const parsed = JSON.parse(decoded);
      return this.normalizeTickets(parsed);
    } catch {
      // Try direct JSON parse
      try {
        const parsed = JSON.parse(param);
        return this.normalizeTickets(parsed);
      } catch {
        // Parse comma-separated format: ticketId:qty,ticketId:qty
        return param.split(',').map((item) => {
          const [ticketId, qty] = item.split(':');
          return { ticketId, quantity: parseInt(qty, 10) || 1 };
        });
      }
    }
  }

  private normalizeTickets(
    tickets: Array<{ id?: string; ticketId?: string; qty?: number; quantity?: number }>
  ): Array<{ ticketId: string; quantity: number }> {
    return tickets.map((t) => ({
      ticketId: t.ticketId || t.id || '',
      quantity: t.quantity || t.qty || 1,
    }));
  }
}
