import { Component, OnInit, computed, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UiExperienceTicketFormComponent, ExperienceTicket, UiCollapsibleComponent } from '@mereka/ui';
import { ExperienceOnboardingService } from '../../services/experience-onboarding.service';
import { FEE_CONFIG } from '../../utils/fee-calculator';

@Component({
  selector: 'app-experience-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UiExperienceTicketFormComponent, UiCollapsibleComponent],
  templateUrl: './tickets.component.html',
})
export class ExperienceTicketsComponent implements OnInit, AfterViewInit {
  @ViewChild('ticketFormComponent') ticketFormComponent!: UiExperienceTicketFormComponent;

  private readonly onboardingService = inject(ExperienceOnboardingService);

  // Form from service
  readonly form: FormGroup = this.onboardingService.ticketsForm;

  // Computed values from form
  readonly feePaidBy = computed(() => this.form.get('feePaidBy')?.value || 'learner');
  readonly tickets = computed(() => this.form.get('tickets')?.value || []);
  readonly currency = computed(() => this.form.get('currency')?.value || 'MYR');

  // Fee config based on currency
  readonly feeConfig = computed(() => {
    const curr = this.currency();
    return FEE_CONFIG[curr as keyof typeof FEE_CONFIG] || FEE_CONFIG.MYR;
  });

  // Derived: absorbServiceFee (true when hub pays)
  readonly absorbServiceFee = computed(() => this.feePaidBy() === 'hub');

  ngOnInit(): void {
    // Set current step
    this.onboardingService.setCurrentStep('tickets');
  }

  ngAfterViewInit(): void {
    // Set tickets to component after view init if we have existing tickets
    const existingTickets = this.tickets();
    if (existingTickets.length > 0 && this.ticketFormComponent) {
      setTimeout(() => {
        this.ticketFormComponent.setTickets(existingTickets);
      });
    }
  }

  // ============================================================================
  // Service Fee Handlers
  // ============================================================================

  onAbsorbServiceFeeChange(absorb: boolean): void {
    this.form.patchValue({
      feePaidBy: absorb ? 'hub' : 'learner',
    });
  }

  // ============================================================================
  // Ticket Handlers
  // ============================================================================

  onTicketsChange(tickets: ExperienceTicket[]): void {
    // Store tickets directly - field names now match API format
    const ticketData = tickets.map(ticket => ({
      ticketType: ticket.ticketType,
      ticketName: ticket.ticketName,
      ticketPrice: ticket.ticketPrice || 0,
      ticketQty: ticket.ticketQty || 0,
      description: ticket.description || '',
      hasCutoffTime: ticket.hasCutoffTime,
      cutoffNumber: ticket.cutoffNumber || 0,
      cutoffTime: ticket.cutoffTime || 'Hour(s)',
      cutoffBeforeAfter: 'before',
    }));

    this.form.patchValue({ tickets: ticketData });
  }

  // ============================================================================
  // Fee Calculation Helpers
  // ============================================================================

  getServiceFeeText(): string {
    const config = this.feeConfig();
    return `${(config.serviceFeePercent * 100).toFixed(0)}% + ${config.currencySymbol} ${config.serviceFeeFixed}`;
  }

  getMerekaFeeText(): string {
    const config = this.feeConfig();
    return `${(config.merekaFeePercent * 100).toFixed(1)}%`;
  }
}
