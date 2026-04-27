import { Component, signal, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, DecimalPipe, DatePipe, CurrencyPipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, CardComponent, BadgeComponent, AvatarComponent, ToastService } from '../../shared/ui';
import { DialogService } from '../../shared/dialog';
import { ServicesService, Experience, ExperienceStatus } from './services.service';

@Component({
  selector: 'app-experience-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DecimalPipe,
    DatePipe,
    CurrencyPipe,
    JsonPipe,
    FormsModule,
    PageHeaderComponent,
    CardComponent,
    BadgeComponent,
    AvatarComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      @if (loading()) {
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <div class="inline-block w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-gray-500">Loading experience details...</p>
        </div>
      </div>
      } @else if (experience()) {
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button (click)="goBack()" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div class="flex items-center gap-3">
                <h1 class="text-xl font-bold text-gray-900">{{ experience()?.experienceTitle }}</h1>
                <span class="px-2 py-1 rounded text-xs font-medium" [class]="getStatusColor(experience()?.status)">
                  {{ experience()?.status }}
                </span>
                @if (experience()?.isFeatured) {
                <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">Featured</span>
                }
              </div>
              <p class="text-sm text-gray-500 mt-0.5">{{ experience()?.slug }}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <!-- Status Actions Dropdown -->
            <div class="relative group">
              <button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2">
                Change Status
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1 hidden group-hover:block">
                @if (experience()?.status !== 'ACTIVE') {
                <button class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50" (click)="updateStatus('ACTIVE')">
                  <span class="w-2 h-2 bg-green-500 rounded-full"></span> Set Active
                </button>
                }
                @if (experience()?.status !== 'DRAFTED') {
                <button class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50" (click)="updateStatus('DRAFTED')">
                  <span class="w-2 h-2 bg-amber-500 rounded-full"></span> Set as Draft
                </button>
                }
                @if (experience()?.status !== 'EXPIRED') {
                <button class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50" (click)="updateStatus('EXPIRED')">
                  <span class="w-2 h-2 bg-gray-400 rounded-full"></span> Mark Expired
                </button>
                }
              </div>
            </div>
            <button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium" (click)="toggleFeatured()">
              {{ experience()?.isFeatured ? 'Remove Featured' : 'Make Featured' }}
            </button>
            <button class="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium" (click)="deleteExperience()">
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column - Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Cover Image -->
            @if (experience()?.coverPhoto) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <img [src]="experience()?.coverPhoto" [alt]="experience()?.experienceTitle" class="w-full h-64 object-cover" />
            </div>
            }

            <!-- Description -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Description</h2>
              <p class="text-gray-700 leading-relaxed whitespace-pre-line">{{ experience()?.experienceDescription || 'No description provided.' }}</p>
            </div>

            <!-- Event Details -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Event Details</h2>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="p-4 bg-gray-50 rounded-lg">
                  <p class="text-gray-500 text-sm">Type</p>
                  <p class="font-medium mt-1">{{ experience()?.experienceType }}</p>
                </div>
                <div class="p-4 bg-gray-50 rounded-lg">
                  <p class="text-gray-500 text-sm">Listing Type</p>
                  <p class="font-medium mt-1 capitalize">{{ experience()?.listingType || 'platform' }}</p>
                </div>
                <div class="p-4 bg-gray-50 rounded-lg">
                  <p class="text-gray-500 text-sm">Audience</p>
                  <p class="font-medium mt-1">{{ experience()?.audienceType }}</p>
                </div>
                <div class="p-4 bg-gray-50 rounded-lg">
                  <p class="text-gray-500 text-sm">Capacity</p>
                  <p class="font-medium mt-1">{{ experience()?.maximumCapacity || 'Unlimited' }}</p>
                </div>
                <div class="p-4 bg-gray-50 rounded-lg">
                  <p class="text-gray-500 text-sm">Views</p>
                  <p class="font-medium mt-1">{{ experience()?.views | number }}</p>
                </div>
                <div class="p-4 bg-gray-50 rounded-lg">
                  <p class="text-gray-500 text-sm">Priority</p>
                  @if (editingPriority()) {
                  <div class="flex items-center gap-2 mt-1">
                    <input type="number" min="1" [ngModel]="priorityValue()" (ngModelChange)="priorityValue.set($event)"
                      (keydown)="onPriorityKeydown($event)" (blur)="savePriority()"
                      class="w-20 px-2 py-1 text-sm border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      autofocus />
                    <button (click)="cancelEditPriority()" class="text-gray-400 hover:text-gray-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  } @else {
                  <button (click)="startEditPriority()"
                    class="font-medium mt-1 inline-flex items-center gap-1 hover:text-primary transition-colors" title="Click to edit priority">
                    {{ experience()?.priority || 1000 }}
                    <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  }
                </div>
                @if (experience()?.rating) {
                <div class="p-4 bg-gray-50 rounded-lg">
                  <p class="text-gray-500 text-sm">Rating</p>
                  <p class="font-medium mt-1">{{ experience()?.rating | number:'1.1-1' }} / 5</p>
                </div>
                }
                @if (experience()?.experienceDuration) {
                <div class="p-4 bg-gray-50 rounded-lg">
                  <p class="text-gray-500 text-sm">Duration</p>
                  <p class="font-medium mt-1">{{ formatDuration(experience()?.experienceDuration) }}</p>
                </div>
                }
              </div>
            </div>

            <!-- Location (Physical/Hybrid) -->
            @if (experience()?.location && (experience()?.experienceType === 'Physical' || experience()?.experienceType === 'Hybrid')) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Location</h2>
              <div class="space-y-2">
                @if (experience()?.location?.streetAddress) {
                <p class="text-gray-700">{{ experience()?.location?.streetAddress }}</p>
                }
                <p class="text-gray-600">
                  {{ experience()?.location?.city }}{{ experience()?.location?.city && experience()?.location?.state ? ', ' : '' }}{{ experience()?.location?.state }}
                  {{ experience()?.location?.postcode }}
                </p>
                <p class="text-gray-600">{{ experience()?.location?.country }}</p>
                @if (experience()?.location?.addressAdditionalNote) {
                <p class="text-sm text-gray-500 mt-2">Note: {{ experience()?.location?.addressAdditionalNote }}</p>
                }
                @if (experience()?.location?.lat && experience()?.location?.lng) {
                <p class="text-xs text-gray-400 mt-2">Coordinates: {{ experience()?.location?.lat }}, {{ experience()?.location?.lng }}</p>
                }
                @if (experience()?.timeZone) {
                <p class="text-sm text-gray-500 mt-2">Timezone: {{ experience()?.timeZone }}</p>
                }
              </div>
            </div>
            }

            <!-- Virtual Meeting Info (Virtual/Hybrid) -->
            @if ((experience()?.experienceType === 'Virtual' || experience()?.experienceType === 'Hybrid') && (experience()?.meetingLink || experience()?.meetingLocation)) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Virtual Meeting</h2>
              @if (experience()?.meetingLink) {
              <div class="mb-3">
                <p class="text-sm text-gray-500 mb-1">Meeting Link</p>
                <a [href]="experience()?.meetingLink" target="_blank" class="text-primary hover:underline break-all">{{ experience()?.meetingLink }}</a>
              </div>
              }
              @if (experience()?.meetingLocation) {
              <div>
                <p class="text-sm text-gray-500 mb-1">Meeting Location</p>
                <p class="text-gray-700">{{ experience()?.meetingLocation }}</p>
              </div>
              }
            </div>
            }

            <!-- Host Details -->
            @if (experience()?.hostDetails && experience()!.hostDetails!.length > 0) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Hosts</h2>
              <div class="space-y-4">
                @for (host of experience()?.hostDetails; track host.expertId || host.email) {
                <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <ui-avatar [imageUrl]="host.profileUrl" [name]="host.fullName || host.expertName || ''" size="lg" />
                  <div class="flex-1">
                    <p class="font-medium">{{ host.fullName || host.expertName }}</p>
                    @if (host.email) {
                    <p class="text-sm text-gray-500">{{ host.email }}</p>
                    }
                    @if (host.description) {
                    <p class="text-sm text-gray-600 mt-1">{{ host.description }}</p>
                    }
                  </div>
                  @if (host.type) {
                  <span class="px-2 py-1 text-xs rounded" [class]="host.type === 'HOST' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'">
                    {{ host.type }}
                  </span>
                  }
                </div>
                }
              </div>
              @if (experience()?.noHost) {
              <p class="text-sm text-gray-500 mt-3">This experience has no designated host.</p>
              }
            </div>
            }

            <!-- Tickets -->
            @if (experience()?.ticket && experience()!.ticket!.length > 0) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Ticket Types</h2>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket Name</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty per Event</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cutoff</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    @for (ticket of experience()?.ticket; track ticket.ticketName) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-3">
                        <p class="font-medium text-gray-900">{{ ticket.ticketName }}</p>
                        @if (ticket.description) {
                        <p class="text-xs text-gray-500 mt-0.5">{{ ticket.description }}</p>
                        }
                      </td>
                      <td class="px-4 py-3">
                        <span class="px-2 py-1 text-xs rounded" [class]="ticket.ticketType === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'">
                          {{ ticket.ticketType }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-right font-medium">
                        {{ experience()?.currency }} {{ ticket.ticketPrice | number:'1.2-2' }}
                      </td>
                      <td class="px-4 py-3 text-center text-gray-600">
                        {{ ticket.ticketQty }}
                      </td>
                      <td class="px-4 py-3 text-sm text-gray-500">
                        @if (ticket.hasCutoffTime) {
                          {{ ticket.cutoffNumber }} {{ ticket.cutoffTime }} {{ ticket.cutoffBeforeAfter }}
                        } @else {
                          -
                        }
                      </td>
                    </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
            }

            <!-- Schedules with Readable Rules -->
            @if (experience()?.schedulesWithReadableRules?.length || experience()?.schedules?.length) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Schedules</h2>
              <div class="space-y-3">
                @if (experience()?.schedulesWithReadableRules?.length) {
                @for (schedule of experience()?.schedulesWithReadableRules; track schedule.uid) {
                <div class="p-4 bg-gray-50 rounded-lg">
                  <div class="flex justify-between items-start gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded capitalize">{{ schedule.recurringType }}</span>
                      </div>
                      <p class="text-sm text-gray-700 mb-1">
                        <span class="font-medium">Recurrence:</span> {{ schedule.readableRule }}
                      </p>
                      <p class="text-sm text-gray-500">Starts: {{ schedule.startDate | date:'medium' }}</p>
                      @if (schedule.endDate) {
                      <p class="text-sm text-gray-500">Until: {{ schedule.endDate | date:'medium' }}</p>
                      }
                    </div>
                  </div>
                </div>
                }
                } @else if (experience()?.schedules?.length) {
                @for (schedule of experience()?.schedules; track schedule.uid) {
                <div class="p-4 bg-gray-50 rounded-lg">
                  <p class="font-medium capitalize">{{ schedule.recurringType }}</p>
                  <p class="text-sm text-gray-500">{{ schedule.startDate | date:'medium' }}</p>
                </div>
                }
                }
              </div>
              @if (experience()?.isMultiDay) {
              <p class="text-sm text-gray-500 mt-3">This is a multi-day experience.</p>
              }
            </div>
            }

            <!-- All Events Table -->
            @if (experience()?.upcomingEvents?.length || experience()?.pastEvents?.length) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">
                Events
                <span class="text-sm font-normal text-gray-500">
                  ({{ (experience()?.upcomingEvents?.length || 0) + (experience()?.pastEvents?.length || 0) }} total)
                </span>
              </h2>

              <!-- Upcoming Events -->
              @if (experience()?.upcomingEvents?.length) {
              <div class="mb-6">
                <h3 class="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                  Upcoming Events ({{ experience()?.upcomingEvents?.length }})
                </h3>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-green-50">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ticket Availability</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      @for (event of experience()?.upcomingEvents; track event._id) {
                      <tr class="hover:bg-green-50/50">
                        <td class="px-4 py-3">
                          <p class="font-medium text-gray-900">{{ event.startTime | date:'EEE, MMM d, yyyy' }}</p>
                          <p class="text-sm text-gray-500">{{ event.startTime | date:'h:mm a' }} - {{ event.endTime | date:'h:mm a' }}</p>
                          <p class="text-xs text-gray-400">{{ event.timeZone }}</p>
                        </td>
                        <td class="px-4 py-3">
                          @if (event.ticketBookings?.length) {
                          <div class="space-y-1">
                            @for (tb of event.ticketBookings; track tb._id) {
                            <div class="flex items-center gap-2 text-sm">
                              <span class="text-gray-700">{{ tb.ticketName }}:</span>
                              <span class="font-medium text-blue-600">{{ tb.totalBooked }} booked</span>
                              <span class="text-gray-400">|</span>
                              <span class="font-medium" [class]="getTicketQty(tb._id) - tb.totalBooked > 0 ? 'text-green-600' : 'text-red-600'">
                                {{ getTicketQty(tb._id) - tb.totalBooked }} available
                              </span>
                            </div>
                            }
                          </div>
                          } @else {
                          <span class="text-gray-400 text-sm">No bookings yet</span>
                          }
                        </td>
                        <td class="px-4 py-3 text-center">
                          <span class="px-2 py-1 text-xs rounded bg-green-100 text-green-700">{{ event.status }}</span>
                        </td>
                      </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
              }

              <!-- Past Events -->
              @if (experience()?.pastEvents?.length) {
              <div>
                <h3 class="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                  <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Past Events ({{ experience()?.pastEvents?.length }})
                </h3>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tickets Booked</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      @for (event of experience()?.pastEvents; track event._id) {
                      <tr class="hover:bg-gray-50 opacity-75">
                        <td class="px-4 py-3">
                          <p class="font-medium text-gray-600">{{ event.startTime | date:'EEE, MMM d, yyyy' }}</p>
                          <p class="text-sm text-gray-400">{{ event.startTime | date:'h:mm a' }} - {{ event.endTime | date:'h:mm a' }}</p>
                          <p class="text-xs text-gray-400">{{ event.timeZone }}</p>
                        </td>
                        <td class="px-4 py-3">
                          @if (event.ticketBookings?.length) {
                          <div class="space-y-1">
                            @for (tb of event.ticketBookings; track tb._id) {
                            <div class="flex items-center gap-2 text-sm">
                              <span class="text-gray-500">{{ tb.ticketName }}:</span>
                              <span class="font-medium text-gray-600">{{ tb.totalBooked }} booked</span>
                            </div>
                            }
                          </div>
                          } @else {
                          <span class="text-gray-400 text-sm">No bookings</span>
                          }
                        </td>
                        <td class="px-4 py-3 text-center">
                          <span class="px-2 py-1 text-xs rounded" [class]="event.status === 'ACTIVE' ? 'bg-gray-100 text-gray-600' : event.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'">
                            {{ event.status }}
                          </span>
                        </td>
                      </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
              }
            </div>
            }

            <!-- Gallery -->
            @if (experience()?.gallery && experience()!.gallery!.length > 0) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Gallery</h2>
              <div class="grid grid-cols-3 gap-4">
                @for (image of experience()?.gallery; track image) {
                <img [src]="image" alt="Gallery" class="w-full h-32 object-cover rounded-lg" />
                }
              </div>
            </div>
            }

            <!-- Additional Information -->
            @if (experience()?.learnerOutcome || experience()?.instruction || experience()?.materialProvided || experience()?.materialNeedToBring) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Additional Information</h2>
              @if (experience()?.learnerOutcome) {
              <div class="mb-4">
                <h3 class="font-medium text-gray-700 mb-2">Learner Outcome</h3>
                <p class="text-gray-600 whitespace-pre-line">{{ experience()?.learnerOutcome }}</p>
              </div>
              }
              @if (experience()?.instruction) {
              <div class="mb-4">
                <h3 class="font-medium text-gray-700 mb-2">Instructions</h3>
                <p class="text-gray-600 whitespace-pre-line">{{ experience()?.instruction }}</p>
              </div>
              }
              @if (experience()?.materialProvided) {
              <div class="mb-4">
                <h3 class="font-medium text-gray-700 mb-2">Materials Provided</h3>
                <p class="text-gray-600 whitespace-pre-line">{{ experience()?.materialProvided }}</p>
              </div>
              }
              @if (experience()?.materialNeedToBring) {
              <div>
                <h3 class="font-medium text-gray-700 mb-2">Materials to Bring</h3>
                <p class="text-gray-600 whitespace-pre-line">{{ experience()?.materialNeedToBring }}</p>
              </div>
              }
            </div>
            }

            <!-- Target Audience -->
            @if (experience()?.targetAudience && experience()!.targetAudience!.length > 0) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Target Audience</h2>
              <div class="flex flex-wrap gap-2">
                @for (audience of experience()?.targetAudience; track audience) {
                <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{{ audience }}</span>
                }
              </div>
              @if (experience()?.expertiseLevel) {
              <p class="text-sm text-gray-500 mt-3">Expertise Level: {{ experience()?.expertiseLevel }}</p>
              }
            </div>
            }
          </div>

          <!-- Right Column - Sidebar -->
          <div class="space-y-6">
            <!-- Hub Info -->
            @if (experience()?.hub) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Hub</h2>
              <div class="flex items-center gap-3">
                <ui-avatar [imageUrl]="experience()?.hub?.logo" [name]="experience()?.hub?.name || ''" size="lg" />
                <div>
                  <p class="font-medium">{{ experience()?.hub?.name }}</p>
                  <p class="text-sm text-gray-500">{{ experience()?.hub?.slug }}</p>
                </div>
              </div>
            </div>
            }

            <!-- Languages -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Languages</h2>
              <div class="space-y-2">
                <div>
                  <p class="text-sm text-gray-500">Primary</p>
                  <p class="font-medium">{{ experience()?.primaryLanguage || 'English' }}</p>
                </div>
                @if (experience()?.secondaryLanguage && experience()!.secondaryLanguage!.length > 0) {
                <div class="pt-2 border-t border-gray-100">
                  <p class="text-sm text-gray-500 mb-1">Secondary</p>
                  <div class="flex flex-wrap gap-1">
                    @for (lang of experience()?.secondaryLanguage; track lang) {
                    <span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{{ lang }}</span>
                    }
                  </div>
                </div>
                }
              </div>
            </div>

            <!-- Pricing & Booking -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Pricing & Booking</h2>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Currency</span>
                  <span class="font-medium">{{ experience()?.currency }}</span>
                </div>
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Fee Paid By</span>
                  <span class="font-medium capitalize">{{ experience()?.feePaidBy || 'learner' }}</span>
                </div>
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Private Booking</span>
                  <span class="font-medium">{{ experience()?.canBookAsPrivate ? 'Yes' : 'No' }}</span>
                </div>
                @if (experience()?.cutOffTime) {
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Cutoff Time</span>
                  <span class="font-medium">{{ experience()?.cutOffTime }} {{ experience()?.cutOffTimeUnit }}</span>
                </div>
                }
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Book Ongoing</span>
                  <span class="font-medium">{{ experience()?.canBookOngoingEvent ? 'Yes' : 'No' }}</span>
                </div>
              </div>
            </div>

            <!-- Technical Details -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Technical Details</h2>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">ID</span>
                  <span class="font-mono text-xs text-gray-700">{{ experience()?._id }}</span>
                </div>
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Hub ID</span>
                  <span class="font-mono text-xs text-gray-700">{{ experience()?.hubId }}</span>
                </div>
                @if (experience()?.createdBy) {
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Created By</span>
                  <span class="font-mono text-xs text-gray-700">{{ experience()?.createdBy }}</span>
                </div>
                }
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Featured</span>
                  <span class="px-2 py-0.5 rounded text-xs" [class]="experience()?.isFeatured ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'">
                    {{ experience()?.isFeatured ? 'Yes' : 'No' }}
                  </span>
                </div>
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Showcase on Profile</span>
                  <span>{{ experience()?.isShowCaseOnProfile ? 'Yes' : 'No' }}</span>
                </div>
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Created</span>
                  <span class="text-gray-700">{{ experience()?.createdAt | date:'medium' }}</span>
                </div>
                <div class="flex justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500">Updated</span>
                  <span class="text-gray-700">{{ experience()?.updatedAt | date:'medium' }}</span>
                </div>
              </div>
            </div>

            <!-- Media Links -->
            @if (experience()?.video || experience()?.poster) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-bold text-gray-900 mb-4">Media</h2>
              @if (experience()?.video) {
              <div class="mb-3">
                <p class="text-sm text-gray-500 mb-1">Video</p>
                <a [href]="experience()?.video" target="_blank" class="text-sm text-primary hover:underline break-all">{{ experience()?.video }}</a>
              </div>
              }
              @if (experience()?.poster) {
              <div>
                <p class="text-sm text-gray-500 mb-1">Poster</p>
                <a [href]="experience()?.poster" target="_blank" class="text-sm text-primary hover:underline break-all">{{ experience()?.poster }}</a>
              </div>
              }
            </div>
            }
          </div>
        </div>
      </div>
      } @else {
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <p class="text-gray-500">Experience not found</p>
          <button (click)="goBack()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
            Go Back
          </button>
        </div>
      </div>
      }
    </div>
  `,
})
export class ExperienceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicesService = inject(ServicesService);
  private readonly dialogService = inject(DialogService);
  private readonly toast = inject(ToastService);

  loading = signal(true);
  experience = signal<Experience | null>(null);

  // Priority editing
  editingPriority = signal(false);
  priorityValue = signal(1000);

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.loadExperience(id);
      }
    });
  }

  loadExperience(id: string) {
    this.loading.set(true);
    this.servicesService.getExperienceById(id).subscribe({
      next: (response) => {
        this.experience.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load experience:', err);
        this.loading.set(false);
        this.toast.error('Failed to load experience');
      },
    });
  }

  getStatusColor(status?: string): string {
    if (!status) return 'bg-gray-100 text-gray-600';
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      DRAFTED: 'bg-amber-100 text-amber-700',
      EXPIRED: 'bg-gray-100 text-gray-500',
      DELETED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  }

  formatDuration(ms?: number): string {
    if (!ms) return '-';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }

  async updateStatus(status: ExperienceStatus) {
    const exp = this.experience();
    if (!exp) return;

    const statusLabels: Record<ExperienceStatus, string> = {
      ACTIVE: 'Active',
      DRAFTED: 'Draft',
      DELETED: 'Deleted',
      EXPIRED: 'Expired',
    };

    const confirmed = await this.dialogService.confirm({
      title: `Change Status to ${statusLabels[status]}`,
      message: `Are you sure you want to change the status to ${statusLabels[status]}?`,
      type: status === 'DELETED' ? 'danger' : 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.updateExperienceStatus(exp._id, status).subscribe({
      next: (response) => {
        this.experience.set(response.data);
        this.toast.success(`Status updated to ${statusLabels[status]}`);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  async toggleFeatured() {
    const exp = this.experience();
    if (!exp) return;

    const action = exp.isFeatured ? 'remove from featured' : 'make featured';
    const confirmed = await this.dialogService.confirm({
      title: exp.isFeatured ? 'Remove Featured' : 'Make Featured',
      message: `Are you sure you want to ${action} this experience?`,
      type: 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.servicesService.toggleExperienceFeatured(exp._id).subscribe({
      next: (response) => {
        this.experience.set(response.data);
        this.toast.success(exp.isFeatured ? 'Removed from featured' : 'Now featured');
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update featured status');
      },
    });
  }

  async deleteExperience() {
    const exp = this.experience();
    if (!exp) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Delete Experience',
      message: `Are you sure you want to delete "${exp.experienceTitle}"?`,
      type: 'danger',
      confirmText: 'Delete',
    });

    if (!confirmed) return;

    this.servicesService.deleteExperience(exp._id).subscribe({
      next: () => {
        this.toast.success('Experience deleted');
        this.router.navigate(['/dashboard/services/experiences']);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to delete experience');
      },
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/services/experiences']);
  }

  // Priority editing methods
  startEditPriority() {
    const exp = this.experience();
    if (!exp) return;
    this.priorityValue.set(exp.priority || 1000);
    this.editingPriority.set(true);
  }

  cancelEditPriority() {
    this.editingPriority.set(false);
  }

  savePriority() {
    const exp = this.experience();
    if (!exp) return;

    const newPriority = this.priorityValue();
    if (newPriority === exp.priority) {
      this.editingPriority.set(false);
      return;
    }

    this.servicesService.updateExperiencePriority(exp._id, newPriority).subscribe({
      next: () => {
        this.experience.set({ ...exp, priority: newPriority });
        this.toast.success('Priority updated');
        this.editingPriority.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update priority');
      },
    });
  }

  onPriorityKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.savePriority();
    } else if (event.key === 'Escape') {
      this.cancelEditPriority();
    }
  }

  /**
   * Get ticket quantity by ticket ID for availability calculations
   */
  getTicketQty(ticketId: string): number {
    const exp = this.experience();
    if (!exp?.ticket) return 0;
    const ticket = exp.ticket.find(t => t.id === ticketId);
    return ticket?.ticketQty ?? 0;
  }
}
