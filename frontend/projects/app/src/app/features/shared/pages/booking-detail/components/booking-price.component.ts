import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BookingDetail, BookingViewMode } from '../booking-detail.service';

@Component({
  selector: 'app-booking-price',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-neutral-200 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-neutral-900">Payment Breakdown</h3>
        <div data-testid="booking-payment-status">
          <span class="text-sm">Status: </span>
          <span
            class="font-semibold uppercase"
            [ngClass]="booking.status === 'cancelled' ? 'text-red-600' : 'text-green-600'"
          >
            {{ getPaymentStatus() }}
          </span>
        </div>
      </div>

      <!-- Ticket Prices -->
      <div class="space-y-3" data-testid="booking-ticket-prices">
        @for (ticket of (booking.selectedTickets || []); track $index) {
          <div class="flex items-center justify-between text-neutral-700">
            <span>
              @if (booking.serviceType !== 'expertise') {
                {{ ticket.quantity || 1 }} x {{ ticket.ticketName || 'Ticket' }}
              } @else {
                {{ ticket.ticketName || 'Session' }}
              }
            </span>
            <span>{{ formatCurrency(ticket.totalPrice) }}</span>
          </div>
        }
      </div>

      <!-- Service Fee -->
      @if (booking.serviceFee && booking.serviceFee > 0 && booking.serviceFeePayBy === 'learner') {
        <div class="flex items-center justify-between text-neutral-700 mt-3" data-testid="booking-service-fee">
          <span class="flex items-center gap-1">
            Service Fee (Paid by User)
            <span class="relative group cursor-help">
              <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-neutral-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                3% + RM1 per booking
              </span>
            </span>
          </span>
          <span>{{ formatCurrency(booking.serviceFee) }}</span>
        </div>
      }

      <!-- Membership Discount -->
      @if (booking.membershipDiscount && booking.membershipDiscount > 0) {
        <div class="flex items-center justify-between text-green-600 mt-3" data-testid="booking-discount">
          <span>Hub Member Discount ({{ booking.membershipDiscount }}%)</span>
          <span>-{{ formatCurrency(booking.membershipDiscountAmount || 0) }}</span>
        </div>
      }

      <!-- Voucher -->
      @if (booking.promotionCode) {
        <div class="flex items-center justify-between text-red-600 mt-3" data-testid="booking-voucher">
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {{ booking.promotionCode }}
          </span>
          <span>-{{ formatCurrency(booking.discountAmount || 0) }}</span>
        </div>
      }

      <!-- Total -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200" data-testid="booking-total-paid">
        <span class="text-lg font-semibold text-neutral-900">
          {{ mode === 'hub' ? 'Total Booking' : 'Total Paid' }}
        </span>
        <span class="text-lg font-semibold text-neutral-900">
          @if (booking.isFree) {
            FREE
          } @else {
            {{ formatCurrency(booking.totalAmount) }}
          }
        </span>
      </div>

      <!-- Hub Payout (Hub mode only) -->
      @if (mode === 'hub' && !booking.isFree) {
        <div class="mt-4 pt-4 border-t border-neutral-200 space-y-2" data-testid="booking-hub-payout-section">
          @if (booking.serviceFee && booking.serviceFee > 0) {
            <div class="flex items-center justify-between text-neutral-700">
              <span>Platform Fee</span>
              <span class="text-red-600">-{{ formatCurrency(booking.serviceFee) }}</span>
            </div>
          }
          <div class="flex items-center justify-between" data-testid="booking-hub-payout">
            <span class="text-lg font-semibold text-neutral-900">Your Payout</span>
            <span class="text-lg font-semibold text-green-600">
              {{ formatCurrency(booking.hubPayout || booking.totalAmount) }}
            </span>
          </div>
        </div>
      }

      <!-- Refund Details (for cancelled bookings) -->
      @if (booking.status === 'cancelled' && booking.refundAmount) {
        <div class="mt-6 pt-6 border-t border-neutral-200" data-testid="booking-refund-details">
          <h4 class="text-base font-semibold text-neutral-900 mb-3">Refund Details</h4>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-neutral-700">
              <span>Total Paid</span>
              <span>{{ formatCurrency(booking.totalAmount) }}</span>
            </div>

            @if (booking.serviceFee) {
              <div class="flex items-center justify-between text-neutral-700">
                <span>Service Fee (Non-refundable)</span>
                <span>{{ formatCurrency(booking.serviceFee) }}</span>
              </div>
            }

            <div class="flex items-center justify-between text-neutral-700">
              <span>{{ booking.refundPercentage || 100 }}% Refund</span>
              <span>{{ formatCurrency(booking.refundAmount) }}</span>
            </div>

            <div class="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200">
              <span class="font-semibold text-neutral-900">Total Refund</span>
              <span class="font-semibold text-green-600">{{ formatCurrency(booking.refundAmount) }}</span>
            </div>
          </div>

          <p class="text-sm text-neutral-500 mt-3">
            The refund has been initiated and can take 5-10 business days to process.
          </p>
        </div>
      }

      <!-- Cancellation Policy -->
      @if (booking.status !== 'cancelled') {
        <div class="mt-6 pt-6 border-t border-neutral-200" data-testid="booking-cancellation-policy">
          <h4 class="text-base font-medium text-neutral-900 mb-2">Cancellation Policy</h4>
          <p class="text-sm text-neutral-600">
            If you wish to cancel your booking, please bear in mind Mereka's cancellation policy.
            <a
              href="https://help.mereka.io/hc/policies/mereka-cancellation-policy"
              target="_blank"
              class="text-primary hover:underline"
            >
              Learn more
            </a>
          </p>
        </div>
      }
    </div>
  `,
})
export class BookingPriceComponent {
  @Input({ required: true }) booking!: BookingDetail;
  @Input() mode: BookingViewMode = 'learner';

  getPaymentStatus(): string {
    if (this.booking.status === 'cancelled') {
      return this.booking.refundAmount ? 'REFUNDED' : 'CANCELLED';
    }
    return 'PAID';
  }

  formatCurrency(amount: number | undefined | null): string {
    const value = amount ?? 0;
    const currency = this.booking?.currency ?? 'MYR';
    return `${currency} ${value.toFixed(2)}`;
  }
}
