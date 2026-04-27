import { Component, inject, OnInit, OnDestroy, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ExpertService } from '../../services';
import { HeaderComponent } from '../../../../shared/components/header';
import { UiFooterComponent } from '@mereka/ui';
import { AuthService } from '../../../../core/services/auth.service';
import { ChatInitiationService } from '../../../../core/services/chat-initiation.service';
import { FavoriteService } from '../../../../core/services/favorite.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-expert-detail',
  standalone: true,
  imports: [RouterLink, HeaderComponent, UiFooterComponent],
  template: `
    <web-header />
    <main class="min-h-screen bg-gray-50">
      @if (expertService.loading()) {
        <!-- Loading State -->
        <div class="animate-pulse">
          <!-- Cover -->
          <div class="h-64 bg-gray-200"></div>
          <!-- Profile -->
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative">
            <div class="bg-white rounded-xl shadow-sm p-6">
              <div class="flex flex-col md:flex-row gap-6">
                <div class="w-32 h-32 rounded-full bg-gray-200"></div>
                <div class="flex-1 space-y-4">
                  <div class="h-8 bg-gray-200 rounded w-1/3"></div>
                  <div class="h-5 bg-gray-200 rounded w-1/4"></div>
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else if (expertService.hasExpert()) {
        @let expert = expertService.expert()!;

        <!-- Owner Banner - Different styles for complete vs incomplete profiles -->
        @if (isOwner()) {
          @if (isIncomplete()) {
            <!-- Incomplete Profile Banner (Warning) -->
            <div class="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span class="font-medium">Your profile is incomplete and only visible to you. Complete it to make it public.</span>
                  </div>
                  <a
                    [href]="appUrl + '/onboarding/expert'"
                    class="px-4 py-1.5 bg-white text-amber-600 rounded-full text-sm font-semibold hover:bg-amber-50 transition-colors"
                  >
                    Complete Profile
                  </a>
                </div>
              </div>
            </div>
          } @else {
            <!-- Complete Profile Banner -->
            <div class="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span class="font-medium">This is your expert profile</span>
                  </div>
                  <a
                    [href]="appUrl + '/onboarding/expert'"
                    class="px-4 py-1.5 bg-white text-emerald-600 rounded-full text-sm font-semibold hover:bg-emerald-50 transition-colors"
                  >
                    Update Profile
                  </a>
                </div>
              </div>
            </div>
          }
        }

        <!-- Cover Image -->
        <div class="relative h-64 lg:h-80 bg-[#1a1623]">
          @if (expert.coverPhoto) {
            <img
              [src]="expert.coverPhoto"
              [alt]="expert.name"
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
                <!-- Profile Photo -->
                <div class="flex-shrink-0">
                  @if (expert.profilePhoto) {
                    <img
                      [src]="expert.profilePhoto"
                      [alt]="expert.name"
                      class="w-32 h-32 lg:w-40 lg:h-40 rounded-full object-cover border-4 border-white shadow-lg mx-auto lg:mx-0"
                    />
                  } @else {
                    <div
                      class="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-[#ececf1] flex items-center justify-center text-4xl font-bold text-gray-600 border-4 border-white shadow-lg mx-auto lg:mx-0"
                    >
                      {{ getInitials(expert.name) }}
                    </div>
                  }
                </div>

                <!-- Info -->
                <div class="flex-1 text-center lg:text-left">
                  <h1 class="text-3xl lg:text-4xl font-bold text-[#1a1623]">
                    {{ expert.name }}
                  </h1>
                  @if (expert.professionalTitle) {
                    <p class="text-xl text-gray-600 mt-2">
                      {{ expert.professionalTitle }}
                    </p>
                  }

                  <!-- Location & Focus Area -->
                  <div class="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-4">
                    @if (expertService.locationText()) {
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
                        {{ expertService.locationText() }}
                      </div>
                    }
                    @if (expert.focusArea) {
                      <span class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {{ expert.focusArea.name }}
                      </span>
                    }
                  </div>

                  <!-- Social Links -->
                  @if (expert.socialLinks) {
                    <div class="flex items-center justify-center lg:justify-start gap-4 mt-6">
                      @if (expert.socialLinks.linkedin) {
                        <a
                          [href]="expert.socialLinks.linkedin"
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
                      @if (expert.socialLinks.twitter) {
                        <a
                          [href]="expert.socialLinks.twitter"
                          target="_blank"
                          class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"
                            />
                          </svg>
                        </a>
                      }
                      @if (expert.socialLinks.instagram) {
                        <a
                          [href]="expert.socialLinks.instagram"
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
                      @if (expert.socialLinks.website) {
                        <a
                          [href]="expert.socialLinks.website"
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
                    </div>
                  }
                </div>

                <!-- Contact Buttons -->
                <div class="flex-shrink-0 text-center lg:text-right space-y-2 lg:space-y-0 lg:space-x-2 flex flex-col lg:flex-row">
                  <!-- Save/Favorite Button -->
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
                  @if (expert.hub && !isOwner()) {
                    <button
                      (click)="contactExpert()"
                      [disabled]="startingChat()"
                      class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      @if (startingChat()) {
                        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      } @else {
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      }
                      Message
                    </button>
                    <a
                      [routerLink]="['/hub', expert.hub.slug]"
                      class="inline-block px-6 py-3 bg-[#1a1623] text-white rounded-full hover:bg-gray-800 transition-colors font-medium"
                    >
                      View Hub
                    </a>
                  } @else if (expert.hub) {
                    <a
                      [routerLink]="['/hub', expert.hub.slug]"
                      class="inline-block px-6 py-3 bg-[#1a1623] text-white rounded-full hover:bg-gray-800 transition-colors font-medium"
                    >
                      View Hub
                    </a>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs & Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Tab Navigation -->
          <div class="flex gap-4 border-b border-gray-200 mb-8">
            @for (tab of tabs; track tab.id) {
              <button
                (click)="activeTab.set(tab.id)"
                [class.border-[#1a1623]]="activeTab() === tab.id"
                [class.text-[#1a1623]]="activeTab() === tab.id"
                [class.border-transparent]="activeTab() !== tab.id"
                [class.text-gray-500]="activeTab() !== tab.id"
                class="px-4 py-3 font-medium border-b-2 -mb-px transition-colors hover:text-[#1a1623]"
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
                <!-- About -->
                @if (expert.bio) {
                  <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold text-[#1a1623] mb-4">About</h2>
                    <p class="text-gray-600 whitespace-pre-line">{{ expert.bio }}</p>
                  </div>
                }

                <!-- Skills -->
                @if (expert.skills?.length) {
                  <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold text-[#1a1623] mb-4">Skills</h2>
                    <div class="flex flex-wrap gap-2">
                      @for (skill of expert.skills; track skill._id) {
                        <span
                          class="px-4 py-2 bg-[#ececf1] text-gray-700 rounded-full text-sm font-medium"
                        >
                          {{ skill.name }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <!-- Languages -->
                @if (expert.languages?.length) {
                  <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold text-[#1a1623] mb-4">Languages</h2>
                    <div class="space-y-3">
                      @for (lang of expert.languages; track lang.language._id) {
                        <div class="flex items-center justify-between">
                          <span class="text-gray-700">{{ lang.language.name }}</span>
                          <span class="text-sm text-gray-500">{{ lang.proficiency }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              }

              @if (activeTab() === 'background') {
                <!-- Education -->
                @if (expert.education?.length) {
                  <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold text-[#1a1623] mb-4">Education</h2>
                    <div class="space-y-4">
                      @for (edu of expert.education; track $index) {
                        <div class="border-l-2 border-emerald-500 pl-4">
                          <h3 class="font-semibold text-gray-900">{{ edu.degree }}</h3>
                          <p class="text-gray-600">{{ edu.institution }}</p>
                          <p class="text-sm text-gray-500">{{ edu.year }}</p>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Employment -->
                @if (expert.employment?.length) {
                  <div class="bg-white rounded-xl shadow-sm p-6">
                    <h2 class="text-xl font-bold text-[#1a1623] mb-4">Work Experience</h2>
                    <div class="space-y-4">
                      @for (job of expert.employment; track $index) {
                        <div class="border-l-2 border-blue-500 pl-4">
                          <h3 class="font-semibold text-gray-900">{{ job.title }}</h3>
                          <p class="text-gray-600">{{ job.company }}</p>
                          @if (job.duration) {
                            <p class="text-sm text-gray-500">{{ job.duration }}</p>
                          }
                          @if (job.description) {
                            <p class="text-gray-600 mt-2">{{ job.description }}</p>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              }

              @if (activeTab() === 'portfolio') {
                @if (expert.portfolio?.length) {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @for (item of expert.portfolio; track $index) {
                      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                        @if (item.images?.length) {
                          <img
                            [src]="item.images![0]"
                            [alt]="item.title"
                            class="w-full h-48 object-cover"
                          />
                        }
                        <div class="p-4">
                          <h3 class="font-semibold text-gray-900">{{ item.title }}</h3>
                          @if (item.year) {
                            <p class="text-sm text-gray-500">{{ item.year }}</p>
                          }
                          @if (item.description) {
                            <p class="text-gray-600 mt-2 text-sm line-clamp-3">
                              {{ item.description }}
                            </p>
                          }
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                    <p class="text-gray-500">No portfolio items yet</p>
                  </div>
                }
              }

              @if (activeTab() === 'services') {
                @if (expertService.servicesLoading()) {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @for (i of [1, 2, 3, 4]; track i) {
                      <div class="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                        <div class="h-32 bg-gray-200 rounded-lg mb-4"></div>
                        <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    }
                  </div>
                } @else if (expertService.hasServices()) {
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @for (service of expertService.services(); track service._id) {
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

              @if (activeTab() === 'reviews') {
                @if (expertService.reviewsLoading()) {
                  <div class="space-y-4">
                    @for (i of [1, 2, 3]; track i) {
                      <div class="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                        <div class="flex items-start gap-4">
                          <div class="w-12 h-12 bg-gray-200 rounded-full"></div>
                          <div class="flex-1 space-y-2">
                            <div class="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div class="h-3 bg-gray-200 rounded w-1/3"></div>
                            <div class="h-4 bg-gray-200 rounded w-full mt-4"></div>
                            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                } @else if (expertService.hasReviews()) {
                  <!-- Reviews Stats -->
                  <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div class="flex items-center gap-6">
                      <div class="text-center">
                        <div class="text-4xl font-bold text-gray-900">{{ expertService.reviewStats().averageRating }}</div>
                        <div class="flex items-center justify-center gap-1 mt-1">
                          @for (star of [1, 2, 3, 4, 5]; track star) {
                            <svg
                              class="w-5 h-5"
                              [class.text-yellow-400]="star <= expertService.reviewStats().averageRating"
                              [class.text-gray-300]="star > expertService.reviewStats().averageRating"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          }
                        </div>
                        <div class="text-sm text-gray-500 mt-1">{{ expertService.reviewStats().totalReviews }} reviews</div>
                      </div>
                      <div class="flex-1 space-y-1">
                        @for (rating of [5, 4, 3, 2, 1]; track rating) {
                          <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-600 w-3">{{ rating }}</span>
                            <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                class="h-full bg-yellow-400 rounded-full"
                                [style.width.%]="expertService.reviewStats().totalReviews > 0 ? (expertService.reviewStats().distribution[rating] / expertService.reviewStats().totalReviews) * 100 : 0"
                              ></div>
                            </div>
                            <span class="text-sm text-gray-500 w-8">{{ expertService.reviewStats().distribution[rating] }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Reviews List -->
                  <div class="space-y-4">
                    @for (review of expertService.reviews(); track review._id) {
                      <div class="bg-white rounded-xl shadow-sm p-6">
                        <div class="flex items-start gap-4">
                          @if (review.reviewer.profilePhoto) {
                            <img
                              [src]="review.reviewer.profilePhoto"
                              [alt]="review.reviewer.name"
                              class="w-12 h-12 rounded-full object-cover"
                            />
                          } @else {
                            <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                              <span class="text-emerald-600 font-medium">{{ getInitials(review.reviewer.name) }}</span>
                            </div>
                          }
                          <div class="flex-1">
                            <div class="flex items-center justify-between">
                              <div>
                                <p class="font-semibold text-gray-900">{{ review.reviewer.name }}</p>
                                <div class="flex items-center gap-1 mt-1">
                                  @for (star of [1, 2, 3, 4, 5]; track star) {
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
                              </div>
                              <span class="text-sm text-gray-500">{{ formatDate(review.createdAt) }}</span>
                            </div>
                            <p class="text-gray-600 mt-3">{{ review.content }}</p>
                            <a
                              [routerLink]="['/', review.service.type, review.service.slug]"
                              class="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mt-3"
                            >
                              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">{{ review.service.type }}</span>
                              {{ review.service.title }}
                            </a>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <p class="text-gray-500">No reviews yet</p>
                  </div>
                }
              }
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
              <!-- Hub Card -->
              @if (expert.hub) {
                <div class="bg-white rounded-xl shadow-sm p-6">
                  <h3 class="text-lg font-bold text-[#1a1623] mb-4">Associated Hub</h3>
                  <a
                    [routerLink]="['/hub', expert.hub.slug]"
                    class="flex items-center gap-4 group"
                  >
                    @if (expert.hub.logo) {
                      <img
                        [src]="expert.hub.logo"
                        [alt]="expert.hub.name"
                        class="w-16 h-16 rounded-lg object-cover"
                      />
                    }
                    <div>
                      <h4 class="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {{ expert.hub.name }}
                      </h4>
                      @if (expert.hub.location) {
                        <p class="text-sm text-gray-500">
                          {{ expert.hub.location.city }}, {{ expert.hub.location.country }}
                        </p>
                      }
                    </div>
                  </a>
                </div>
              }

              <!-- Stats -->
              <div class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="text-lg font-bold text-[#1a1623] mb-4">Stats</h3>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600">Expertises</span>
                    <span class="font-semibold">{{ expert.expertisesCount || 0 }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600">Experiences</span>
                    <span class="font-semibold">{{ expert.experiencesCount || 0 }}</span>
                  </div>
                  @if (expert.hourlyRate) {
                    <div class="flex items-center justify-between">
                      <span class="text-gray-600">Hourly Rate</span>
                      <span class="font-semibold">
                        {{ expert.currency || 'MYR' }} {{ expert.hourlyRate }}
                      </span>
                    </div>
                  }
                </div>
              </div>
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
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Expert not found</h3>
            <p class="text-gray-600 mb-6">
              {{ expertService.error() || 'The expert you are looking for does not exist.' }}
            </p>
            <a
              routerLink="/experts"
              class="inline-block px-6 py-3 bg-[#1a1623] text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              Browse Experts
            </a>
          </div>
        </div>
      }
    </main>
    <ui-footer />
  `,
})
export class ExpertDetailPage implements OnInit, OnDestroy {
  readonly expertService = inject(ExpertService);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatInitiationService);
  readonly favoriteService = inject(FavoriteService);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy$ = new Subject<void>();
  private readonly apiUrl = environment.apiUrl;

  readonly appUrl = environment.appUrls.app;
  readonly activeTab = signal<'about' | 'background' | 'portfolio' | 'services' | 'reviews'>('about');
  readonly startingChat = signal(false);
  private authRetryDone = false;
  private currentSlug: string | null = null;

  // Use isOwner from backend response (more reliable than client-side computation)
  readonly isOwner = computed(() => {
    const expert = this.expertService.expert();
    return expert?.isOwner ?? false;
  });

  // Check if profile is incomplete (owner should see banner to complete)
  readonly isIncomplete = computed(() => {
    const expert = this.expertService.expert();
    return expert?.isIncomplete ?? false;
  });

  // Check if expert is favorited
  readonly isFavorited = computed(() => {
    const expert = this.expertService.expert();
    if (!expert?._id) return false;
    // Check API response first (isFavorited from backend)
    if (expert.isFavorited !== undefined) return expert.isFavorited;
    // Check local state from favoriteService
    return this.favoriteService.isFavorited('expert', expert._id);
  });

  readonly tabs = [
    { id: 'about' as const, label: 'About' },
    { id: 'background' as const, label: 'Background' },
    { id: 'portfolio' as const, label: 'Portfolio' },
    { id: 'services' as const, label: 'Services' },
    { id: 'reviews' as const, label: 'Reviews' },
  ];

  constructor() {
    // Watch for auth initialization to refetch with credentials
    // This handles two cases:
    // 1. SSR returned 404 (incomplete profile without auth)
    // 2. SSR returned data but without owner flags (need to refetch with auth to get isOwner)
    effect(() => {
      const isInitialized = this.authService.isInitialized();
      const user = this.authService.user();
      const notFoundDuringSsr = this.expertService.notFoundDuringSsr();
      const expert = this.expertService.expert();

      // Skip if not initialized, no user, or already retried
      if (!isInitialized || !user || this.authRetryDone || !this.currentSlug) {
        return;
      }

      // Case 1: SSR returned 404, retry with auth
      // Case 2: SSR returned data but isOwner is false/undefined (SSR had no auth), refetch to get owner flags
      const needsRefetch = notFoundDuringSsr || (expert && !expert.isOwner);

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
        this.authRetryDone = false;
        this.loadExpert(slug);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.expertService.clearDetail();
  }

  private loadExpert(slug: string): void {
    this.expertService.getExpertBySlug(slug).subscribe((expert) => {
      if (expert) {
        // Load services when on services tab
        this.expertService.getExpertServices(slug);
        // Load reviews
        this.expertService.getExpertReviews(slug);
      }
    });
  }

  private retryWithAuth(slug: string): void {
    this.expertService.retryWithAuth(slug).subscribe((expert) => {
      if (expert) {
        // Load services after successful retry
        this.expertService.getExpertServices(slug);
        // Load reviews
        this.expertService.getExpertReviews(slug);
      }
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Contact expert via chat
   * Opens chat with the hub associated with this expert
   */
  async contactExpert(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const expert = this.expertService.expert();
    if (!expert?.hub?._id) {
      console.error('No expert or hub available');
      return;
    }

    this.startingChat.set(true);
    try {
      await this.chatService.initiateChat({
        hubId: expert.hub._id,
        contextType: 'HUB',
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      this.startingChat.set(false);
    }
  }

  /**
   * Toggle favorite for this expert
   */
  async onSave(): Promise<void> {
    const expert = this.expertService.expert();
    if (!expert?._id) return;
    await this.favoriteService.toggleFavorite('expert', expert._id);
  }
}
