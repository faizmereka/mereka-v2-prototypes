import { Component, OnInit, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UiScheduleFormComponent, ScheduleFormData, UiCollapsibleComponent } from '@mereka/ui';
import { ExperienceOnboardingService } from '../../services/experience-onboarding.service';
import { durationToMs, msToDuration } from '../../utils/fee-calculator';

@Component({
  selector: 'app-experience-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UiScheduleFormComponent, UiCollapsibleComponent],
  templateUrl: './booking.component.html',
})
export class ExperienceBookingComponent implements OnInit {
  @ViewChild('scheduleFormComponent') scheduleFormComponent!: UiScheduleFormComponent;

  private readonly onboardingService = inject(ExperienceOnboardingService);

  // Form from service
  readonly form: FormGroup = this.onboardingService.bookingForm;

  // Computed values from form
  readonly durationHours = computed(() => this.form.get('durationHours')?.value || 1);
  readonly durationMinutes = computed(() => this.form.get('durationMinutes')?.value || 0);
  readonly timeZone = computed(() => this.form.get('timeZone')?.value || Intl.DateTimeFormat().resolvedOptions().timeZone);
  readonly schedules = computed(() => this.form.get('schedules')?.value || []);

  // Computed initial data for the schedule form component
  readonly initialScheduleData = computed<Partial<ScheduleFormData>>(() => {
    const hours = this.durationHours();
    const minutes = this.durationMinutes();
    return {
      experienceDuration: durationToMs(hours, minutes),
      timezone: this.timeZone(),
      schedules: this.schedules(),
    };
  });

  ngOnInit(): void {
    // Set current step
    this.onboardingService.setCurrentStep('booking');
  }

  // ============================================================================
  // Schedule Form Handlers
  // ============================================================================

  onScheduleDataChange(data: ScheduleFormData): void {
    // Convert duration from ms to hours/minutes
    const duration = msToDuration(data.experienceDuration || 0);

    // Update form with schedule data
    this.form.patchValue({
      durationHours: duration.hours,
      durationMinutes: duration.minutes,
      timeZone: data.timezone,
      schedules: data.schedules || [],
    });
  }
}
