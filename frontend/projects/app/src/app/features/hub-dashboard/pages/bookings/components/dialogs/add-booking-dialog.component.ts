import { Component, inject, signal, computed, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@mereka/ui';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import type { BookingServiceType } from '../../../../models/hub-booking.model';

// ============================================================================
// Interfaces
// ============================================================================

export interface AddBookingDialogData {
  hubId: string;
  serviceType: BookingServiceType;
}

export interface AddBookingDialogResult {
  confirmed: boolean;
  bookingId?: string;
}

interface ServiceOption {
  _id: string;
  title: string;
  coverPhoto?: string;
  type?: string;
}

interface EventOption {
  _id: string;
  startTime: string;
  endTime: string;
  availableSeats: number;
  totalSeats: number;
  tickets: TicketOption[];
}

interface TicketOption {
  _id: string;
  name: string;
  price: number;
  currency: string;
  availableQty: number;
}

interface LearnerDetail {
  name: string;
  email: string;
  phone: string;
  ticketId?: string;
}

// ============================================================================
// Component
// ============================================================================

@Component({
  selector: 'app-add-booking-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="add-booking-dialog">
      <!-- Header -->
      <div class="dialog-header">
        @if (currentStep() === 'select-service') {
          <h3>Add Bookings</h3>
        } @else if (currentStep() === 'choose-date') {
          <h3>Choose Date & Time</h3>
        } @else {
          <div class="header-with-info">
            <h3>{{ selectedService()?.title }}</h3>
            @if (selectedEvent()) {
              <p class="event-time">
                {{ formatDate(selectedEvent()!.startTime) }} |
                {{ formatTime(selectedEvent()!.startTime) }} - {{ formatTime(selectedEvent()!.endTime) }}
              </p>
            }
          </div>
        }
        <button class="close-btn" (click)="close()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        @if (loading()) {
          <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading...</p>
          </div>
        } @else if (error()) {
          <div class="error-container">
            <p>{{ error() }}</p>
            <button class="retry-btn" (click)="loadServices()">Try Again</button>
          </div>
        } @else {
          <!-- Step 1: Select Service -->
          @if (currentStep() === 'select-service') {
            <div class="step-content">
              <p class="step-description">Choose from your listings to add bookings for it.</p>

              <!-- Service Type Tabs -->
              <div class="service-type-tabs">
                <button
                  class="tab-btn"
                  [class.active]="selectedServiceType() === 'experience'"
                  (click)="setServiceType('experience')"
                >
                  Experiences
                </button>
                <button
                  class="tab-btn"
                  [class.active]="selectedServiceType() === 'expertise'"
                  (click)="setServiceType('expertise')"
                >
                  Expertise
                </button>
              </div>

              <!-- Service Search -->
              <div class="service-search">
                <input
                  type="text"
                  class="search-input"
                  [placeholder]="selectedServiceType() === 'experience' ? 'Search experiences...' : 'Search expertise...'"
                  [(ngModel)]="searchText"
                  (ngModelChange)="filterServices($event)"
                />
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>

              <!-- Service List -->
              <div class="service-list">
                @if (filteredServices().length === 0) {
                  <div class="empty-state">
                    <p>No {{ selectedServiceType() === 'experience' ? 'experiences' : 'expertise' }} found.</p>
                  </div>
                } @else {
                  @for (service of filteredServices(); track service._id) {
                    <button
                      class="service-item"
                      [class.selected]="selectedService()?._id === service._id"
                      (click)="selectService(service)"
                    >
                      <div class="service-image">
                        @if (service.coverPhoto) {
                          <img [src]="service.coverPhoto" [alt]="service.title" />
                        } @else {
                          <div class="placeholder-image">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        }
                      </div>
                      <div class="service-info">
                        <span class="service-title">{{ service.title }}</span>
                        @if (service.type) {
                          <span class="service-type">{{ service.type }}</span>
                        }
                      </div>
                      @if (selectedService()?._id === service._id) {
                        <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      }
                    </button>
                  }
                }
              </div>
            </div>
          }

          <!-- Step 2: Choose Date & Event -->
          @if (currentStep() === 'choose-date') {
            <div class="step-content">
              <p class="step-description">Choose a session from the listing.</p>

              @if (loadingEvents()) {
                <div class="loading-container">
                  <div class="spinner"></div>
                  <p>Loading available sessions...</p>
                </div>
              } @else if (events().length === 0) {
                <div class="empty-state">
                  <p>No upcoming sessions available for this service.</p>
                </div>
              } @else {
                <div class="events-list">
                  @for (event of events(); track event._id) {
                    <button
                      class="event-item"
                      [class.selected]="selectedEvent()?._id === event._id"
                      [class.disabled]="event.availableSeats === 0"
                      [disabled]="event.availableSeats === 0"
                      (click)="selectEvent(event)"
                    >
                      <div class="event-radio">
                        <div class="radio-circle" [class.checked]="selectedEvent()?._id === event._id"></div>
                      </div>
                      <div class="event-info">
                        <span class="event-date">{{ formatDate(event.startTime) }}</span>
                        <span class="event-time">
                          {{ formatTime(event.startTime) }} - {{ formatTime(event.endTime) }}
                        </span>
                      </div>
                      <div class="event-seats" [class.low]="event.availableSeats < 5" [class.none]="event.availableSeats === 0">
                        {{ event.availableSeats }}/{{ event.totalSeats }} seats
                      </div>
                    </button>
                  }
                </div>
              }
            </div>
          }

          <!-- Step 3: Add Learner Details -->
          @if (currentStep() === 'add-learners') {
            <div class="step-content">
              <div class="learner-header">
                <div>
                  <h5>Add User's Details</h5>
                  <p>By adding user details, tickets and email invitation will be sent to everyone listed.</p>
                </div>
                <span class="seats-info">
                  {{ learners().length }}/{{ selectedEvent()?.availableSeats ?? 0 }} seats
                </span>
              </div>

              <div class="learners-list">
                @for (learner of learners(); track $index; let i = $index) {
                  <div class="learner-card">
                    <div class="learner-header-row">
                      <span class="learner-number">Learner {{ i + 1 }}</span>
                      @if (learners().length > 1) {
                        <button class="remove-btn" (click)="removeLearner(i)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      }
                    </div>
                    <div class="learner-fields">
                      <div class="field">
                        <label>Name *</label>
                        <input
                          type="text"
                          [(ngModel)]="learner.name"
                          placeholder="Enter name"
                          [class.error]="submitted() && !learner.name"
                        />
                      </div>
                      <div class="field">
                        <label>Email *</label>
                        <input
                          type="email"
                          [(ngModel)]="learner.email"
                          placeholder="Enter email"
                          [class.error]="submitted() && !learner.email"
                        />
                      </div>
                      <div class="field">
                        <label>Phone *</label>
                        <input
                          type="tel"
                          [(ngModel)]="learner.phone"
                          placeholder="Enter phone"
                          [class.error]="submitted() && !learner.phone"
                        />
                      </div>
                      @if (selectedEvent()?.tickets && selectedEvent()!.tickets.length > 1) {
                        <div class="field">
                          <label>Ticket Type</label>
                          <select [(ngModel)]="learner.ticketId">
                            @for (ticket of selectedEvent()!.tickets; track ticket._id) {
                              <option [value]="ticket._id">{{ ticket.name }} - {{ ticket.currency }} {{ ticket.price }}</option>
                            }
                          </select>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Add More Button -->
              @if (canAddMoreLearners()) {
                <button class="add-learner-btn" (click)="addLearner()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Booking
                </button>
              }
            </div>
          }
        }
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        @if (currentStep() === 'select-service') {
          <button class="cancel-btn" (click)="close()">Cancel</button>
          <button
            class="next-btn"
            [disabled]="!selectedService()"
            (click)="goToChooseDate()"
          >
            Choose Date
          </button>
        } @else if (currentStep() === 'choose-date') {
          <button class="back-btn" (click)="goBack()">Back</button>
          <button
            class="next-btn"
            [disabled]="!selectedEvent()"
            (click)="goToAddLearners()"
          >
            Continue
          </button>
        } @else if (currentStep() === 'add-learners') {
          <button class="back-btn" (click)="goBack()">Back</button>
          <button
            class="submit-btn"
            [disabled]="submitting() || !isFormValid()"
            (click)="submitBooking()"
          >
            @if (submitting()) {
              <span class="spinner-small"></span>
            }
            Add Bookings
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .add-booking-dialog {
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);

      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
      }

      .header-with-info {
        h3 {
          margin-bottom: 4px;
        }
        .event-time {
          margin: 0;
          font-size: 13px;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .close-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        flex-shrink: 0;

        &:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        svg {
          width: 20px;
          height: 20px;
          stroke-width: 2;
        }
      }
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      min-height: 300px;
    }

    .step-description {
      margin: 0 0 16px 0;
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
    }

    .service-type-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;

      .tab-btn {
        flex: 1;
        padding: 10px 16px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        background: #fff;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          border-color: #000;
        }

        &.active {
          background: #000;
          color: #fff;
          border-color: #000;
        }
      }
    }

    .service-search {
      position: relative;
      margin-bottom: 16px;

      .search-input {
        width: 100%;
        padding: 12px 12px 12px 40px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        font-size: 14px;

        &:focus {
          outline: none;
          border-color: #000;
        }
      }

      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 18px;
        height: 18px;
        color: rgba(0, 0, 0, 0.4);
        stroke-width: 2;
      }
    }

    .service-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
    }

    .service-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;

      &:hover {
        border-color: rgba(0, 0, 0, 0.2);
      }

      &.selected {
        border-color: #000;
        background: rgba(0, 0, 0, 0.02);
      }

      .service-image {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        overflow: hidden;
        flex-shrink: 0;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-image {
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;

          svg {
            width: 24px;
            height: 24px;
            color: rgba(0, 0, 0, 0.3);
            stroke-width: 1.5;
          }
        }
      }

      .service-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .service-title {
          font-weight: 500;
          font-size: 14px;
        }

        .service-type {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.5);
        }
      }

      .check-icon {
        width: 20px;
        height: 20px;
        color: #000;
        stroke-width: 2.5;
      }
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 350px;
      overflow-y: auto;
    }

    .event-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;

      &:hover:not(.disabled) {
        border-color: rgba(0, 0, 0, 0.2);
      }

      &.selected {
        border-color: #000;
        background: rgba(0, 0, 0, 0.02);
      }

      &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .event-radio {
        .radio-circle {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0, 0, 0, 0.3);
          border-radius: 50%;
          transition: all 0.2s;

          &.checked {
            border-color: #000;
            background: #000;
            box-shadow: inset 0 0 0 3px #fff;
          }
        }
      }

      .event-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .event-date {
          font-weight: 500;
          font-size: 14px;
        }

        .event-time {
          font-size: 13px;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .event-seats {
        font-size: 13px;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(0, 128, 0, 0.1);
        color: green;

        &.low {
          background: rgba(255, 165, 0, 0.1);
          color: orange;
        }

        &.none {
          background: rgba(255, 0, 0, 0.1);
          color: red;
        }
      }
    }

    .learner-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;

      h5 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }

      p {
        margin: 0;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.6);
      }

      .seats-info {
        font-size: 13px;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.04);
      }
    }

    .learners-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 300px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .learner-card {
      padding: 16px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.01);

      .learner-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .learner-number {
          font-weight: 600;
          font-size: 14px;
        }

        .remove-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: rgba(0, 0, 0, 0.5);
          cursor: pointer;

          &:hover {
            background: rgba(255, 0, 0, 0.1);
            color: red;
          }

          svg {
            width: 16px;
            height: 16px;
            stroke-width: 2;
          }
        }
      }

      .learner-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        .field {
          display: flex;
          flex-direction: column;
          gap: 4px;

          &:first-child {
            grid-column: 1 / -1;
          }

          label {
            font-size: 12px;
            font-weight: 500;
            color: rgba(0, 0, 0, 0.6);
          }

          input, select {
            padding: 10px 12px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 6px;
            font-size: 14px;

            &:focus {
              outline: none;
              border-color: #000;
            }

            &.error {
              border-color: red;
            }
          }
        }
      }
    }

    .add-learner-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px;
      margin-top: 16px;
      border: 1px dashed rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      background: transparent;
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #000;
        color: #000;
      }

      svg {
        width: 18px;
        height: 18px;
        stroke-width: 2;
      }
    }

    .loading-container, .error-container, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;

      p {
        margin: 12px 0 0 0;
        color: rgba(0, 0, 0, 0.6);
      }

      .retry-btn {
        margin-top: 12px;
        padding: 8px 16px;
        border: 1px solid #000;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;

        &:hover {
          background: #000;
          color: #fff;
        }
      }
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top-color: #000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);

      button {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .cancel-btn, .back-btn {
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: #fff;

        &:hover {
          border-color: #000;
        }
      }

      .next-btn, .submit-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
        background: #000;
        color: #fff;

        &:hover:not(:disabled) {
          background: #333;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  `]
})
export class AddBookingDialogComponent implements OnInit {
  private readonly dialogRef = inject<DialogRef<AddBookingDialogResult>>(DialogRef);
  readonly data = inject<AddBookingDialogData>(DIALOG_DATA);
  private readonly http = inject(HttpClient);

  // Step management
  readonly currentStep = signal<'select-service' | 'choose-date' | 'add-learners'>('select-service');

  // Loading states
  readonly loading = signal(false);
  readonly loadingEvents = signal(false);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);

  // Service selection
  readonly selectedServiceType = signal<'experience' | 'expertise'>(
    this.data.serviceType === 'all' ? 'experience' : this.data.serviceType as 'experience' | 'expertise'
  );
  readonly services = signal<ServiceOption[]>([]);
  readonly filteredServices = signal<ServiceOption[]>([]);
  readonly selectedService = signal<ServiceOption | null>(null);
  searchText = '';

  // Event selection
  readonly events = signal<EventOption[]>([]);
  readonly selectedEvent = signal<EventOption | null>(null);

  // Learner details
  readonly learners = signal<LearnerDetail[]>([{ name: '', email: '', phone: '' }]);

  // Computed
  readonly canAddMoreLearners = computed(() => {
    const event = this.selectedEvent();
    return event ? this.learners().length < event.availableSeats : false;
  });

  async ngOnInit(): Promise<void> {
    await this.loadServices();
  }

  async loadServices(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const serviceType = this.selectedServiceType();
      const url = `${environment.apiUrl}/hub/${this.data.hubId}/${serviceType === 'experience' ? 'experiences' : 'expertises'}`;

      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: ServiceOption[] | { experiences?: ServiceOption[]; expertises?: ServiceOption[] } }>(url, { withCredentials: true })
      );

      // Handle different response formats:
      // - Experiences: { data: { experiences: [...] } }
      // - Expertises: { data: [...] }
      let items: ServiceOption[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          items = response.data;
        } else if (response.data.experiences) {
          items = response.data.experiences;
        } else if (response.data.expertises) {
          items = response.data.expertises;
        }
      }

      const mappedServices = items.map(item => ({
        _id: item._id,
        title: (item as any).experienceTitle || (item as any).expertiseTitle || item.title || 'Untitled',
        coverPhoto: (item as any).coverPhoto || (item as any).coverPhotoUrl,
        type: (item as any).experienceType || (item as any).expertiseType || item.type,
      }));
      this.services.set(mappedServices);
      this.filteredServices.set(mappedServices);
    } catch (err) {
      console.error('Failed to load services:', err);
      this.error.set('Failed to load services. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  setServiceType(type: 'experience' | 'expertise'): void {
    if (this.selectedServiceType() !== type) {
      this.selectedServiceType.set(type);
      this.selectedService.set(null);
      this.searchText = '';
      this.loadServices();
    }
  }

  filterServices(searchText: string): void {
    const term = searchText.toLowerCase();
    const filtered = this.services().filter(s =>
      s.title.toLowerCase().includes(term)
    );
    this.filteredServices.set(filtered);
  }

  selectService(service: ServiceOption): void {
    this.selectedService.set(service);
  }

  async goToChooseDate(): Promise<void> {
    if (!this.selectedService()) return;

    this.currentStep.set('choose-date');
    await this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    const service = this.selectedService();
    if (!service) return;

    this.loadingEvents.set(true);

    try {
      const serviceType = this.selectedServiceType();

      if (serviceType === 'experience') {
        // Experiences use sessions endpoint
        const url = `${environment.apiUrl}/hub/${this.data.hubId}/experiences/${service._id}/sessions?filter=upcoming`;
        const response = await firstValueFrom(
          this.http.get<{ success: boolean; data: { sessions: Array<{
            _id: string;
            startTime: string;
            endTime: string;
            maxCapacity: number;
            bookingCount: number;
            tickets: Array<{ ticketId: string; ticketName: string; totalCapacity: number; available: number }>;
          }> } }>(url, { withCredentials: true })
        );

        if (response.success && response.data?.sessions) {
          // Map sessions to events format
          const events: EventOption[] = response.data.sessions.map(session => ({
            _id: session._id,
            startTime: session.startTime,
            endTime: session.endTime,
            totalSeats: session.maxCapacity,
            availableSeats: session.maxCapacity - session.bookingCount,
            tickets: session.tickets.map(t => ({
              _id: t.ticketId,
              name: t.ticketName,
              price: 0, // Price not returned in sessions, will use ticket from service
              currency: 'MYR',
              availableQty: t.available,
            })),
          }));
          this.events.set(events.filter(e => e.availableSeats > 0));
        } else {
          this.events.set([]);
        }
      } else {
        // Expertises use slots endpoint
        const url = `${environment.apiUrl}/hub/${this.data.hubId}/expertises/${service._id}/slots`;
        const response = await firstValueFrom(
          this.http.get<{ success: boolean; data: { availableDates: Array<{
            date: string;
            dayOfWeek: string;
            slots: Array<{ time: string; available: boolean }>;
          }>; tickets: Array<{ id: string; name: string; price: number }> } }>(url, { withCredentials: true })
        );

        if (response.success && response.data?.availableDates) {
          // Convert slots to events format for UI consistency
          const events: EventOption[] = [];
          const tickets = response.data.tickets || [];

          for (const dateSlot of response.data.availableDates) {
            for (const slot of dateSlot.slots.filter(s => s.available)) {
              const startTime = new Date(`${dateSlot.date}T${slot.time}:00`);
              const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

              events.push({
                _id: `${dateSlot.date}-${slot.time}`, // Composite ID for slot
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                totalSeats: 1,
                availableSeats: 1,
                tickets: tickets.map(t => ({
                  _id: t.id,
                  name: t.name,
                  price: t.price,
                  currency: 'MYR',
                  availableQty: 1,
                })),
              });
            }
          }
          this.events.set(events);
        } else {
          this.events.set([]);
        }
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      this.events.set([]);
    } finally {
      this.loadingEvents.set(false);
    }
  }

  selectEvent(event: EventOption): void {
    if (event.availableSeats > 0) {
      this.selectedEvent.set(event);
    }
  }

  goToAddLearners(): void {
    if (!this.selectedEvent()) return;

    // Set default ticket for learners
    const event = this.selectedEvent();
    if (event?.tickets?.length) {
      this.learners.update(learners =>
        learners.map(l => ({ ...l, ticketId: l.ticketId || event.tickets[0]._id }))
      );
    }

    this.currentStep.set('add-learners');
  }

  goBack(): void {
    const step = this.currentStep();
    if (step === 'choose-date') {
      this.currentStep.set('select-service');
      this.selectedEvent.set(null);
    } else if (step === 'add-learners') {
      this.currentStep.set('choose-date');
    }
  }

  addLearner(): void {
    const event = this.selectedEvent();
    if (!event || this.learners().length >= event.availableSeats) return;

    const defaultTicketId = event.tickets?.[0]?._id;
    this.learners.update(learners => [...learners, { name: '', email: '', phone: '', ticketId: defaultTicketId }]);
  }

  removeLearner(index: number): void {
    if (this.learners().length <= 1) return;
    this.learners.update(learners => learners.filter((_, i) => i !== index));
  }

  isFormValid(): boolean {
    return this.learners().every(l => l.name && l.email && l.phone);
  }

  async submitBooking(): Promise<void> {
    this.submitted.set(true);

    if (!this.isFormValid()) return;

    const service = this.selectedService();
    const event = this.selectedEvent();
    if (!service || !event) return;

    this.submitting.set(true);

    try {
      const payload = {
        serviceType: this.selectedServiceType(),
        serviceId: service._id,
        eventId: event._id,
        learners: this.learners(),
        addedByHub: true,
      };

      const url = `${environment.apiUrl}/hub/${this.data.hubId}/bookings`;
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: { _id: string } }>(url, payload, { withCredentials: true })
      );

      if (response.success && response.data?._id) {
        this.dialogRef.close({ confirmed: true, bookingId: response.data._id });
      } else {
        throw new Error('Failed to create booking');
      }
    } catch (err) {
      console.error('Failed to create booking:', err);
      this.error.set('Failed to create booking. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  close(): void {
    this.dialogRef.close({ confirmed: false });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}
