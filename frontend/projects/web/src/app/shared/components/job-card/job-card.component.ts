import { Component, Input, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { JobListItem } from '../../../features/jobs/models/job.model';

@Component({
  selector: 'web-job-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="['/jobs', job._id]"
       class="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow group">
      <div class="flex items-start gap-3">
        <!-- Organization Logo/Initial -->
        <div class="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
          @if (job.organizationName) {
            <span class="text-lg font-bold text-primary">{{ job.organizationName.charAt(0).toUpperCase() }}</span>
          } @else {
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          }
        </div>

        <!-- Job Info -->
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
            {{ job.jobTitle }}
          </h3>
          @if (job.organizationName) {
            <p class="text-sm text-gray-600 line-clamp-1 mt-0.5">{{ job.organizationName }}</p>
          }
        </div>
      </div>

      <!-- Job Details -->
      <div class="mt-3 pt-3 border-t border-gray-100 space-y-2">
        <!-- Employment Type & Expert Level -->
        <div class="flex flex-wrap gap-2">
          @if (job.employmentType) {
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  [class]="employmentTypeClass()">
              {{ formatEmploymentType() }}
            </span>
          }
          @if (job.expertLevel) {
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {{ formatExpertLevel() }}
            </span>
          }
        </div>

        <!-- Location & Budget -->
        <div class="flex items-center justify-between text-sm text-gray-500">
          @if (job.jobLocation) {
            <div class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
              <span>{{ formatLocation() }}</span>
            </div>
          }
          @if (job.jobBudget) {
            <span class="font-semibold text-primary">{{ formatBudget() }}</span>
          }
        </div>

        <!-- Posted Date -->
        @if (postedAgo()) {
          <p class="text-xs text-gray-400">{{ postedAgo() }}</p>
        }
      </div>
    </a>
  `,
})
export class JobCardComponent {
  @Input({ required: true }) job!: JobListItem;

  readonly employmentTypeClass = computed(() => {
    switch (this.job?.employmentType) {
      case 'full-time':
        return 'bg-green-100 text-green-700';
      case 'part-time':
        return 'bg-blue-100 text-blue-700';
      case 'freelance':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  });

  formatEmploymentType(): string {
    switch (this.job?.employmentType) {
      case 'full-time':
        return 'Full-time';
      case 'part-time':
        return 'Part-time';
      case 'freelance':
        return 'Freelance';
      default:
        return this.job?.employmentType || '';
    }
  }

  formatExpertLevel(): string {
    if (!this.job?.expertLevel) return '';
    return this.job.expertLevel.charAt(0).toUpperCase() + this.job.expertLevel.slice(1).replace(/-/g, ' ');
  }

  formatLocation(): string {
    if (!this.job?.jobLocation) return '';
    switch (this.job.jobLocation) {
      case 'remote':
        return 'Remote';
      case 'onSite':
        return 'On-site';
      case 'hybrid':
        return 'Hybrid';
      default:
        return this.job.jobLocation;
    }
  }

  formatBudget(): string {
    if (!this.job?.jobBudget) return '';
    const { fromAmount, upToAmount, pricingType } = this.job.jobBudget;
    const currency = this.job.jobCurrency || 'MYR';
    const unit = pricingType === 'hourly' ? '/hr' : '';
    let range = `${currency} ${fromAmount.toLocaleString()}${unit}`;
    if (upToAmount) {
      range += ` - ${upToAmount.toLocaleString()}${unit}`;
    }
    return range;
  }

  postedAgo(): string {
    const dateStr = this.job?.createdDate || this.job?.createdAt;
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Posted today';
    if (diffDays === 1) return 'Posted yesterday';
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Posted ${Math.floor(diffDays / 30)} months ago`;
    return `Posted ${Math.floor(diffDays / 365)} years ago`;
  }
}
