import { Component, input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

export interface PriceSummaryTicket {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

@Component({
  selector: 'app-price-summary',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      <!-- Cover Photo -->
      @if (coverPhoto()) {
        <div class="aspect-[16/9] overflow-hidden">
          <img
            [src]="coverPhoto()"
            [alt]="title()"
            class="w-full h-full object-cover"
          />
        </div>
      }

      <div class="p-6 space-y-4">
        <!-- Title & Hub -->
        <div>
          <h3 class="font-semibold text-lg text-neutral-900">{{ title() }}</h3>
          @if (hubName()) {
            <p class="text-sm text-neutral-500">by {{ hubName() }}</p>
          }
        </div>

        <!-- Event/Session Info -->
        @if (eventInfo()) {
          <div class="flex items-center gap-2 text-sm text-neutral-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{{ eventInfo() }}</span>
          </div>
        }

        <hr class="border-neutral-200" />

        <!-- Tickets Breakdown -->
        @if (tickets().length > 0) {
          <div class="space-y-2">
            @for (ticket of tickets(); track ticket.name) {
              <div class="flex justify-between text-sm">
                <span class="text-neutral-600">
                  {{ ticket.quantity }}x {{ ticket.name }}
                </span>
                <span class="text-neutral-900">
                  {{ ticket.subtotal | currency:currency():'symbol':'1.2-2' }}
                </span>
              </div>
            }
          </div>
        }

        <hr class="border-neutral-200" />

        <!-- Pricing Breakdown -->
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-neutral-600">Subtotal</span>
            <span class="text-neutral-900">
              {{ subtotal() | currency:currency():'symbol':'1.2-2' }}
            </span>
          </div>

          @if (discount() > 0) {
            <div class="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{{ discount() | currency:currency():'symbol':'1.2-2' }}</span>
            </div>
          }

          @if (serviceFee() > 0) {
            <div class="flex justify-between text-sm">
              <span class="text-neutral-600">Service Fee</span>
              <span class="text-neutral-900">
                {{ serviceFee() | currency:currency():'symbol':'1.2-2' }}
              </span>
            </div>
          } @else if (!isHubPayingFee()) {
            <div class="flex justify-between text-sm">
              <span class="text-neutral-600">Service Fee</span>
              <span class="text-neutral-500">Included</span>
            </div>
          }
        </div>

        <hr class="border-neutral-200" />

        <!-- Total -->
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold text-neutral-900">Total</span>
          <span class="text-xl font-bold text-primary-600">
            @if (total() === 0) {
              FREE
            } @else {
              {{ total() | currency:currency():'symbol':'1.2-2' }}
            }
          </span>
        </div>

        <!-- Coupon Input Slot -->
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class PriceSummaryComponent {
  readonly title = input<string>('');
  readonly hubName = input<string>('');
  readonly coverPhoto = input<string>('');
  readonly eventInfo = input<string>('');
  readonly tickets = input<PriceSummaryTicket[]>([]);
  readonly currency = input<string>('MYR');
  readonly subtotal = input<number>(0);
  readonly serviceFee = input<number>(0);
  readonly discount = input<number>(0);
  readonly total = input<number>(0);
  readonly isHubPayingFee = input<boolean>(false);
}
