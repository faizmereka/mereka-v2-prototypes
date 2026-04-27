import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSkeletonComponent } from './skeleton.component';

/**
 * Pre-built skeleton for dashboard pages with header, stats, and content areas
 *
 * Usage:
 * <ui-skeleton-dashboard />
 * <ui-skeleton-dashboard [showStats]="false" />
 */
@Component({
  selector: 'ui-skeleton-dashboard',
  imports: [CommonModule, UiSkeletonComponent],
  template: `
    <div class="animate-pulse">
      <!-- Header Section -->
      <div class="flex items-start justify-between gap-6 mb-12">
        <div class="space-y-2">
          <ui-skeleton variant="line" width="w-64" height="h-8" />
          <div class="flex items-center gap-4">
            <ui-skeleton variant="line" width="w-40" height="h-8" [delay]="100" />
            <ui-skeleton variant="line" width="w-24" height="h-4" [delay]="150" />
          </div>
        </div>

        @if (showEarnings()) {
          <!-- Earnings Card Skeleton -->
          <div class="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center gap-5 min-w-[300px]">
            <ui-skeleton variant="rect" width="w-14" height="h-14" rounded="rounded-xl" />
            <div class="flex-1 space-y-2">
              <ui-skeleton variant="line" width="w-28" height="h-3" />
              <ui-skeleton variant="line" width="w-20" height="h-6" [delay]="100" />
              <ui-skeleton variant="line" width="w-16" height="h-3" [delay]="150" />
            </div>
          </div>
        }
      </div>

      @if (showSetupSection()) {
        <!-- Setup Section Skeleton -->
        <div class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <ui-skeleton variant="line" width="w-40" height="h-6" />
            <div class="flex items-center gap-2">
              <ui-skeleton variant="circle" width="w-10" height="h-10" />
              <ui-skeleton variant="circle" width="w-10" height="h-10" [delay]="50" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            @for (i of [0, 1]; track i) {
              <div class="bg-white rounded-xl border border-neutral-200 p-6 flex gap-5">
                <ui-skeleton variant="rect" width="w-28" height="h-24" rounded="rounded-lg" [delay]="i * 100" />
                <div class="flex-1 space-y-3">
                  <ui-skeleton variant="line" width="w-40" height="h-5" [delay]="i * 100 + 50" />
                  <ui-skeleton variant="line" width="w-full" height="h-3" [delay]="i * 100 + 100" />
                  <ui-skeleton variant="line" width="w-3/4" height="h-3" [delay]="i * 100 + 150" />
                  <ui-skeleton variant="line" width="w-24" height="h-8" rounded="rounded-lg" [delay]="i * 100 + 200" />
                </div>
              </div>
            }
          </div>
        </div>
      }

      @if (showListings()) {
        <!-- Listings Section Skeleton -->
        <div class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <ui-skeleton variant="line" width="w-32" height="h-6" />
            <ui-skeleton variant="line" width="w-20" height="h-4" />
          </div>
          <div class="grid grid-cols-4 gap-4">
            @for (i of [0, 1, 2, 3]; track i) {
              <div class="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                <ui-skeleton variant="rect" width="w-12" height="h-12" rounded="rounded-lg" [delay]="i * 50" />
                <div class="flex-1 space-y-2">
                  <ui-skeleton variant="line" width="w-16" height="h-5" [delay]="i * 50 + 25" />
                  <ui-skeleton variant="line" width="w-12" height="h-3" [delay]="i * 50 + 50" />
                </div>
              </div>
            }
          </div>
        </div>
      }

      @if (showOrders()) {
        <!-- Orders Section Skeleton -->
        <div class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <ui-skeleton variant="line" width="w-32" height="h-6" />
              <ui-skeleton variant="rect" width="w-6" height="h-6" rounded="rounded-full" />
            </div>
            <ui-skeleton variant="line" width="w-24" height="h-8" rounded="rounded-lg" />
          </div>
          <div class="space-y-3">
            @for (i of [0, 1, 2]; track i) {
              <div class="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-4">
                <ui-skeleton variant="circle" width="w-10" height="h-10" [delay]="i * 75" />
                <div class="flex-1 space-y-2">
                  <ui-skeleton variant="line" width="w-40" height="h-4" [delay]="i * 75 + 25" />
                  <ui-skeleton variant="line" width="w-24" height="h-3" [delay]="i * 75 + 50" />
                </div>
                <ui-skeleton variant="line" width="w-20" height="h-4" [delay]="i * 75 + 75" />
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class UiSkeletonDashboardComponent {
  readonly showEarnings = input<boolean>(true);
  readonly showSetupSection = input<boolean>(true);
  readonly showListings = input<boolean>(true);
  readonly showOrders = input<boolean>(true);
}
