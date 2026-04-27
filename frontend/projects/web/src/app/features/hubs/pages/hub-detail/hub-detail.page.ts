import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HubService } from '../../services';
import { AuthService } from '../../../../core/services/auth.service';
import { ChatInitiationService } from '../../../../core/services/chat-initiation.service';
import { FavoriteService } from '../../../../core/services/favorite.service';
import { HeaderComponent } from '../../../../shared/components/header';
import { UiFooterComponent } from '@mereka/ui';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-hub-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, UiFooterComponent],
  template: `
    <web-header />

    <!-- Owner Banner - Shows when user is a hub member -->
    @if (isOwner()) {
      @if (isDraft()) {
        <!-- Amber/Orange warning banner for draft hubs -->
        <div class="bg-amber-500 text-white">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span class="text-sm sm:text-base font-medium">
                  Your hub profile is in draft and only visible to you. Complete the setup to make it public.
                </span>
              </div>
              <a
                [href]="hubOnboardingUrl"
                class="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Complete Setup
              </a>
            </div>
          </div>
        </div>
      } @else {
        <!-- Green banner for active hubs -->
        <div class="bg-emerald-600 text-white">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span class="text-sm sm:text-base font-medium">
                  This is your hub profile. Make changes from your Hub Dashboard.
                </span>
              </div>
              <a
                [href]="hubDashboardUrl"
                class="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Go to Settings
              </a>
            </div>
          </div>
        </div>
      }
    }

    <main class="min-h-screen bg-gray-50">
      @if (hubService.loading()) {
        <!-- Loading State -->
        <div class="animate-pulse">
          <!-- Cover -->
          <div class="h-64 bg-gray-200"></div>
          <!-- Profile -->
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative">
            <div class="bg-white rounded-xl shadow-sm p-6">
              <div class="flex flex-col md:flex-row gap-6">
                <div class="w-24 h-24 rounded-xl bg-gray-200"></div>
                <div class="flex-1 space-y-4">
                  <div class="h-8 bg-gray-200 rounded w-1/3"></div>
                  <div class="h-5 bg-gray-200 rounded w-1/4"></div>
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else if (hubService.hasHub()) {
        @let hub = hubService.hub()!;

        <!-- Cover Image -->
        <div class="relative h-64 lg:h-80 bg-[#1a1623]">
          @if (hub.coverImage) {
            <img
              [src]="hub.coverImage"
              [alt]="hub.name"
              class="w-full h-full object-cover opacity-50"
            />
          }
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        <!-- Profile Section -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="p-6 lg:p-8">
              <div class="flex flex-col lg:flex-row gap-6 lg:gap-8">
                <!-- Logo -->
                <div class="flex-shrink-0">
                  @if (hub.logo) {
                    <img
                      [src]="hub.logo"
                      [alt]="hub.name"
                      class="w-24 h-24 lg:w-32 lg:h-32 rounded-xl object-cover border-4 border-white shadow-lg mx-auto lg:mx-0"
                    />
                  } @else {
                    <div
                      class="w-24 h-24 lg:w-32 lg:h-32 rounded-xl bg-[#ececf1] flex items-center justify-center text-3xl font-bold text-gray-600 border-4 border-white shadow-lg mx-auto lg:mx-0"
                    >
                      {{ getInitials(hub.name) }}
                    </div>
                  }
                </div>

                <!-- Info -->
                <div class="flex-1 text-center lg:text-left">
                  <h1 class="text-3xl lg:text-4xl font-bold text-[#1a1623]">
                    {{ hub.name }}
                  </h1>
                  @if (hub.companyType) {
                    <p class="text-xl text-gray-600 mt-2">
                      {{ hub.companyType.name }}
                    </p>
                  }

                  <!-- Location -->
                  <div class="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-4">
                    @if (hubService.locationText()) {
                      <div class="flex items-center gap-2 text-gray-600">
                        <svg
                          class="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {{ hubService.locationText() }}
                      </div>
                    }
                  </div>

                  <!-- Focus Areas -->
                  @if (hub.focusAreas?.length) {
                    <div class="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-4">
                      @for (focus of hub.focusAreas!.slice(0, 5); track focus._id) {
                        <span
                          class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium"
                        >
                          {{ focus.name }}
                        </span>
                      }
                      @if (hub.focusAreas!.length > 5) {
                        <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                          +{{ hub.focusAreas!.length - 5 }} more
                        </span>
                      }
                    </div>
                  }

                  <!-- Social Links -->
                  @if (hub.socialLinks) {
                    <div class="flex items-center justify-center lg:justify-start gap-4 mt-6">
                      @if (hub.socialLinks.website) {
                        <a
                          [href]="hub.socialLinks.website"
                          target="_blank"
                          class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                          </svg>
                        </a>
                      }
                      @if (hub.socialLinks.linkedin) {
                        <a
                          [href]="hub.socialLinks.linkedin"
                          target="_blank"
                          class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                            />
                          </svg>
                        </a>
                      }
                      @if (hub.socialLinks.facebook) {
                        <a
                          [href]="hub.socialLinks.facebook"
                          target="_blank"
                          class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                            />
                          </svg>
                        </a>
                      }
                      @if (hub.socialLinks.instagram) {
                        <a
                          [href]="hub.socialLinks.instagram"
                          target="_blank"
                          class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                            />
                          </svg>
                        </a>
                      }
                      @if (hub.socialLinks.email) {
                        <a
                          [href]="'mailto:' + hub.socialLinks.email"
                          class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </a>
                      }
                    </div>
                  }
                </div>

                <!-- Contact Buttons -->
                <div class="flex-shrink-0 text-center lg:text-right">
                  <div class="flex flex-col sm:flex-row gap-3 justify-center lg:justify-end">
                    <!-- Save/Favorite Button - Only for non-owners -->
                    @if (!isOwner()) {
                      <button
                        (click)="onSave()"
                        class="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 rounded-full transition-colors font-medium"
                        [class.border-red-400]="isFavorited()"
                        [class.bg-red-50]="isFavorited()"
                        [class.text-red-600]="isFavorited()"
                        [class.border-gray-300]="!isFavorited()"
                        [class.hover:border-gray-400]="!isFavorited()"
                        [class.text-gray-700]="!isFavorited()"
                        [attr.aria-label]="isFavorited() ? 'Remove from favorites' : 'Add to favorites'"
                      >
                        @if (isFavorited()) {
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                          Saved
                        } @else {
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          Save
                        }
                      </button>
                    }
                    <!-- Message Hub Button - Only for non-owners -->
                    @if (!isOwner()) {
                      <button
                        (click)="startChat()"
                        [disabled]="startingChat()"
                        class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        @if (startingChat()) {
                          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        } @else {
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        }
                        Message Hub
                      </button>
                    }
                    <!-- Contact Hub Button - Phone -->
                    @if (hub.phoneNumber) {
                      <a
                        [href]="'tel:' + hub.phoneNumber"
                        class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1a1623] text-white rounded-full hover:bg-gray-800 transition-colors font-medium"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Contact Hub
                      </a>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs & Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Tab Navigation -->
          <div class="flex gap-4 border-b border-gray-200 mb-8 overflow-x-auto">
            @for (tab of tabs; track tab.id) {
              <button
                (click)="activeTab.set(tab.id)"
                [class.border-[#1a1623]]="activeTab() === tab.id"
                [class.text-[#1a1623]]="activeTab() === tab.id"
                [class.border-transparent]="activeTab() !== tab.id"
                [class.text-gray-500]="activeTab() !== tab.id"
                class="px-4 py-3 font-medium border-b-2 -mb-px transition-colors hover:text-[#1a1623] whitespace-nowrap"
              >
                {{ tab.label }}
              </button>
            }
          </div>

          <!-- Tab Content -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-8">
              @if (activeTab() === 'about') {
                <!-- Description -->
                @if (hub.description) {
                  <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold text-[#1a1623] mb-4">About</h2>
                    <div class="text-gray-600 prose prose-sm max-w-none" [innerHTML]="hub.description"></div>
                  </div>
                }

                <!-- Services Tags -->
                @if (hub.services?.length) {
                  <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold text-[#1a1623] mb-4">Services</h2>
                    <div class="flex flex-wrap gap-2">
                      @for (service of hub.services; track service) {
                        <span
                          class="px-4 py-2 bg-[#ececf1] text-gray-700 rounded-full text-sm font-medium"
                        >
                          {{ service }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <!-- Amenities -->
                @if (hub.amenities?.length) {
                  <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold text-[#1a1623] mb-4">Amenities</h2>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                      @for (amenity of hub.amenities; track amenity._id) {
                        <div class="flex items-center gap-2 text-gray-600">
                          <svg
                            class="w-5 h-5 text-emerald-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {{ amenity.name }}
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Facilities -->
                @if (hub.facilities?.length) {
                  <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold text-[#1a1623] mb-4">Facilities</h2>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                      @for (facility of hub.facilities; track facility._id) {
                        <div class="flex items-center gap-2 text-gray-600">
                          <svg
                            class="w-5 h-5 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          {{ facility.name }}
                        </div>
                      }
                    </div>
                  </div>
                }
              }

              @if (activeTab() === 'services') {
                @if (hubService.servicesLoading()) {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @for (i of [1, 2, 3, 4]; track i) {
                      <div class="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                        <div class="h-32 bg-gray-200 rounded-lg mb-4"></div>
                        <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    }
                  </div>
                } @else if (hubService.hasServices()) {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @for (service of hubService.services(); track service._id) {
                      <a
                        [routerLink]="['/', service.type, service.slug]"
                        class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow group"
                      >
                        @if (service.coverPhoto) {
                          <img
                            [src]="service.coverPhoto"
                            [alt]="service.title"
                            class="w-full h-32 object-cover"
                          />
                        } @else {
                          <div class="w-full h-32 bg-gray-100 flex items-center justify-center">
                            <svg
                              class="w-12 h-12 text-gray-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        }
                        <div class="p-4">
                          <span
                            class="px-2 py-1 text-xs font-medium rounded-full"
                            [class.bg-purple-100]="service.type === 'expertise'"
                            [class.text-purple-700]="service.type === 'expertise'"
                            [class.bg-blue-100]="service.type === 'experience'"
                            [class.text-blue-700]="service.type === 'experience'"
                          >
                            {{ service.type === 'expertise' ? 'Expertise' : 'Experience' }}
                          </span>
                          <h3 class="font-semibold text-gray-900 mt-2 group-hover:text-emerald-600 transition-colors">
                            {{ service.title }}
                          </h3>
                          @if (service.price !== undefined) {
                            <p class="text-sm text-gray-600 mt-1">
                              From {{ service.currency || 'MYR' }} {{ service.price }}
                            </p>
                          }
                        </div>
                      </a>
                    }
                  </div>
                } @else {
                  <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                    <p class="text-gray-500">No services available</p>
                  </div>
                }
              }

              @if (activeTab() === 'experts') {
                @if (hubService.expertsLoading()) {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @for (i of [1, 2, 3, 4]; track i) {
                      <div class="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                        <div class="flex items-center gap-4">
                          <div class="w-16 h-16 rounded-full bg-gray-200"></div>
                          <div class="flex-1">
                            <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                } @else if (hubService.hasExperts()) {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @for (expert of hubService.experts(); track expert._id) {
                      <a
                        [routerLink]="['/expert', expert.username]"
                        class="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow group"
                      >
                        <div class="flex items-center gap-4">
                          @if (expert.profilePhoto) {
                            <img
                              [src]="expert.profilePhoto"
                              [alt]="expert.name"
                              class="w-16 h-16 rounded-full object-cover"
                            />
                          } @else {
                            <div
                              class="w-16 h-16 rounded-full bg-[#ececf1] flex items-center justify-center text-xl font-semibold text-gray-600"
                            >
                              {{ getInitials(expert.name) }}
                            </div>
                          }
                          <div class="flex-1 min-w-0">
                            <h3 class="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors truncate">
                              {{ expert.name }}
                            </h3>
                            @if (expert.professionalTitle) {
                              <p class="text-sm text-gray-600 truncate">
                                {{ expert.professionalTitle }}
                              </p>
                            }
                            @if (expert.focusArea) {
                              <span class="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                                {{ expert.focusArea.name }}
                              </span>
                            }
                          </div>
                        </div>
                      </a>
                    }
                  </div>
                } @else {
                  <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                    <p class="text-gray-500">No experts available</p>
                  </div>
                }
              }

              @if (activeTab() === 'gallery') {
                @if (hub.gallery?.length) {
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    @for (image of hub.gallery; track image) {
                      <div class="aspect-square rounded-xl overflow-hidden">
                        <img
                          [src]="image"
                          [alt]="hub.name"
                          class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    }
                  </div>
                } @else {
                  <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                    <p class="text-gray-500">No gallery images available</p>
                  </div>
                }
              }

              @if (activeTab() === 'reviews') {
                <div class="bg-white rounded-xl shadow-sm p-6" data-testid="hub-reviews-section">
                  @if (hubService.reviewsLoading()) {
                    <div class="flex items-center justify-center py-12">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  } @else if (hubService.reviews().length > 0) {
                    <!-- Reviews Summary -->
                    <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                      <div class="text-center">
                        <div class="text-4xl font-bold text-gray-900">{{ hub.rating?.toFixed(1) || '0.0' }}</div>
                        <div class="flex items-center gap-0.5 justify-center mt-1">
                          @for (star of [1,2,3,4,5]; track star) {
                            <svg
                              class="w-5 h-5"
                              [class.text-yellow-400]="star <= (hub.rating || 0)"
                              [class.text-gray-300]="star > (hub.rating || 0)"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          }
                        </div>
                        <div class="text-sm text-gray-500 mt-1">{{ hub.totalReviews || 0 }} reviews</div>
                      </div>
                    </div>

                    <!-- Reviews List -->
                    <div class="space-y-6">
                      @for (review of hubService.reviews(); track review._id) {
                        <div class="pb-6 border-b border-gray-100 last:border-0 last:pb-0" data-testid="hub-review-item">
                          <div class="flex items-start gap-4">
                            <!-- Reviewer Avatar -->
                            <div class="flex-shrink-0">
                              @if (review.reviewer?.profileImage) {
                                <img
                                  [src]="review.reviewer?.profileImage"
                                  [alt]="review.reviewer?.name"
                                  class="w-10 h-10 rounded-full object-cover"
                                />
                              } @else {
                                <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium">
                                  {{ getInitials(review.reviewer?.name || 'A') }}
                                </div>
                              }
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center justify-between">
                                <p class="font-medium text-gray-900">{{ review.reviewer?.name || 'Anonymous' }}</p>
                                <p class="text-sm text-gray-500">{{ review.createdAt | date:'mediumDate' }}</p>
                              </div>
                              <!-- Rating -->
                              <div class="flex items-center gap-0.5 mt-1">
                                @for (star of [1,2,3,4,5]; track star) {
                                  <svg
                                    class="w-4 h-4"
                                    [class.text-yellow-400]="star <= review.rating"
                                    [class.text-gray-300]="star > review.rating"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                }
                              </div>
                              <!-- Review Content -->
                              <p class="text-gray-600 mt-2" data-testid="hub-review-content">{{ review.content }}</p>
                              <!-- Review Photos -->
                              @if (review.photos?.length) {
                                <div class="flex flex-wrap gap-2 mt-3">
                                  @for (photo of review.photos?.slice(0, 4); track photo) {
                                    <img
                                      [src]="photo"
                                      alt="Review photo"
                                      class="w-16 h-16 rounded-lg object-cover"
                                    />
                                  }
                                </div>
                              }
                              <!-- Hub Reply -->
                              @if (review.reply) {
                                <div class="mt-3 p-3 bg-gray-50 rounded-lg" data-testid="hub-review-reply">
                                  <div class="flex items-center gap-2 mb-1">
                                    @if (hub.logo) {
                                      <img [src]="hub.logo" [alt]="hub.name" class="w-5 h-5 rounded-full" />
                                    }
                                    <span class="text-sm font-medium text-gray-700">{{ hub.name }}</span>
                                  </div>
                                  <p class="text-sm text-gray-600">{{ review.reply.content }}</p>
                                </div>
                              }
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="text-center py-8">
                      <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <h4 class="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h4>
                      <p class="text-gray-500">Be the first to leave a review!</p>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
              <!-- Stats Card -->
              <div class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-bold text-[#1a1623] mb-4">Stats</h3>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600">Experts</span>
                    <span class="font-semibold">{{ hub.expertsCount || 0 }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600">Expertises</span>
                    <span class="font-semibold">{{ hub.expertisesCount || 0 }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600">Experiences</span>
                    <span class="font-semibold">{{ hub.experiencesCount || 0 }}</span>
                  </div>
                  @if (hub.totalReviews) {
                    <div class="flex items-center justify-between">
                      <span class="text-gray-600">Reviews</span>
                      <span class="font-semibold">{{ hub.totalReviews }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Location Card -->
              @if (hub.displayFullAddress && hubService.fullAddressText()) {
                <div class="bg-white rounded-xl shadow-sm p-6">
                  <h3 class="text-lg font-bold text-[#1a1623] mb-4">Location</h3>
                  <p class="text-gray-600">{{ hubService.fullAddressText() }}</p>
                </div>
              }

              <!-- Operating Hours -->
              @if (hub.operatingHours) {
                <div class="bg-white rounded-xl shadow-sm p-6">
                  <h3 class="text-lg font-bold text-[#1a1623] mb-4">Operating Hours</h3>
                  <div class="space-y-2 text-sm">
                    @for (hours of hubService.formatOperatingHours(hub.operatingHours); track hours) {
                      <div class="flex justify-between">
                        <span class="text-gray-600">{{ hours.split(':')[0] }}</span>
                        <span class="font-medium">{{ hours.split(':').slice(1).join(':').trim() }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Intro Video -->
              @if (hub.introVideo) {
                <div class="bg-white rounded-xl shadow-sm p-6">
                  <h3 class="text-lg font-bold text-[#1a1623] mb-4">Introduction</h3>
                  <div class="aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <iframe
                      [src]="hub.introVideo"
                      class="w-full h-full"
                      frameborder="0"
                      allowfullscreen
                    ></iframe>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- Error State -->
        <div class="min-h-[60vh] flex items-center justify-center">
          <div class="text-center">
            <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                class="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Hub not found</h3>
            <p class="text-gray-600 mb-6">
              {{ hubService.error() || 'The hub you are looking for does not exist.' }}
            </p>
            <a
              routerLink="/hubs"
              class="inline-block px-6 py-3 bg-[#1a1623] text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              Browse Hubs
            </a>
          </div>
        </div>
      }
    </main>
    <ui-footer />
  `,
})
export class HubDetailPage implements OnInit, OnDestroy {
  readonly hubService = inject(HubService);
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatInitiationService);
  readonly favoriteService = inject(FavoriteService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  readonly activeTab = signal<'about' | 'services' | 'experts' | 'gallery' | 'reviews'>('about');
  readonly startingChat = signal(false);
  readonly hubDashboardUrl = `${environment.appUrls.app}/hub/settings/account`;
  readonly hubOnboardingUrl = `${environment.appUrls.app}/onboarding/hub/profile`;

  // Track SSR retry state
  private authRetryDone = false;
  private currentSlug: string | null = null;

  readonly tabs = [
    { id: 'about' as const, label: 'About' },
    { id: 'services' as const, label: 'Services' },
    { id: 'experts' as const, label: 'Experts' },
    { id: 'gallery' as const, label: 'Gallery' },
    { id: 'reviews' as const, label: 'Reviews' },
  ];

  // Computed: Use backend isOwner flag
  readonly isOwner = computed(() => {
    const hub = this.hubService.hub();
    return hub?.isOwner ?? false;
  });

  // Computed: Use backend isDraft flag
  readonly isDraft = computed(() => {
    const hub = this.hubService.hub();
    return hub?.isDraft ?? false;
  });

  // Check if hub is favorited
  readonly isFavorited = computed(() => {
    const hub = this.hubService.hub();
    if (!hub?._id) return false;
    // Check API response first (isFavorited from backend)
    if (hub.isFavorited !== undefined) return hub.isFavorited;
    // Check local state from favoriteService
    return this.favoriteService.isFavorited('hub', hub._id);
  });

  constructor() {
    // Watch for auth initialization to refetch with credentials
    // This handles two cases:
    // 1. SSR returned 404 (draft hub without auth)
    // 2. SSR returned data but without owner flags (need to refetch with auth to get isOwner)
    effect(() => {
      const isInitialized = this.authService.isInitialized();
      const user = this.authService.user();
      const notFoundDuringSsr = this.hubService.notFoundDuringSsr();
      const hub = this.hubService.hub();

      // Skip if not initialized, no user, or already retried
      if (!isInitialized || !user || this.authRetryDone || !this.currentSlug) {
        return;
      }

      // Case 1: SSR returned 404, retry with auth
      // Case 2: SSR returned data but isOwner is false/undefined (SSR had no auth), refetch to get owner flags
      const needsRefetch = notFoundDuringSsr || (hub && !hub.isOwner);

      if (needsRefetch) {
        this.authRetryDone = true;
        this.retryWithAuth(this.currentSlug);
      }
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.currentSlug = slug;
        this.authRetryDone = false; // Reset for new slug
        this.loadHub(slug);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.hubService.clearDetail();
  }

  private loadHub(slug: string): void {
    this.hubService.getHubBySlug(slug).subscribe((hub) => {
      if (hub) {
        // Load experts, services (use slug), and reviews (use _id)
        this.hubService.getHubExperts(slug);
        this.hubService.getHubServices(slug);
        this.hubService.getHubReviews(hub._id);
      }
    });
  }

  private retryWithAuth(slug: string): void {
    this.hubService.retryWithAuth(slug).subscribe((hub) => {
      if (hub) {
        // Load experts, services (use slug), and reviews (use _id)
        this.hubService.getHubExperts(slug);
        this.hubService.getHubServices(slug);
        this.hubService.getHubReviews(hub._id);
      }
    });
  }

  /**
   * Start a chat with this hub
   * If not authenticated, redirects to login first
   */
  async startChat(): Promise<void> {
    const hub = this.hubService.hub();
    if (!hub) return;

    this.startingChat.set(true);
    try {
      await this.chatService.initiateChat({
        hubId: hub._id,
        contextType: 'HUB',
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
      // Could show a toast here if needed
    } finally {
      this.startingChat.set(false);
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Toggle favorite for this hub
   */
  async onSave(): Promise<void> {
    const hub = this.hubService.hub();
    if (!hub?._id) return;
    await this.favoriteService.toggleFavorite('hub', hub._id);
  }
}
