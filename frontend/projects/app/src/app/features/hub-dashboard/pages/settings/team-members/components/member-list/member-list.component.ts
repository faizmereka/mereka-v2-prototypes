import { Component, Input, Output, EventEmitter, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@mereka/ui';
import type { DisplayMember, TeamTab } from '../../team-members.component';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="member-list h-full flex flex-col">
      <!-- Search -->
      <div class="p-4 border-b border-neutral-200 flex-shrink-0">
        <div class="relative">
          <ui-icon name="search" size="sm" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            [ngModel]="searchText"
            (ngModelChange)="searchChanged.emit($event)"
            [placeholder]="activeTab === 'team_member' ? 'Search Team Members' : 'Search Collaborators'"
            class="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <!-- Member List with Infinite Scroll -->
      <div
        #scrollContainer
        class="flex-1 overflow-y-auto"
        (scroll)="onScroll($event)"
      >
        @if (members.length === 0 && !loading) {
          <div class="p-8 text-center text-neutral-500">
            <p>No {{ activeTab === 'team_member' ? 'team members' : 'collaborators' }} found</p>
          </div>
        } @else {
          @for (member of members; track member.id) {
            <div
              class="member-item p-4 cursor-pointer hover:bg-neutral-50 transition-colors border-b border-neutral-100"
              [ngClass]="{ 'bg-primary/5 border-l-4 border-l-primary': selectedMemberId === member.id }"
              (click)="memberSelected.emit(member)"
            >
              <div class="flex items-center gap-3">
                <!-- Avatar -->
                @if (member.avatar) {
                  <img
                    [src]="member.avatar"
                    [alt]="member.name"
                    class="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                } @else {
                  <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span class="text-white text-sm font-semibold">{{ getInitials(member.name) }}</span>
                  </div>
                }

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-neutral-900 truncate">{{ member.name }}</p>
                  <p class="text-sm text-neutral-500 truncate">{{ member.email }}</p>
                  <p class="text-xs text-neutral-400 uppercase mt-0.5">
                    {{ member.isOwner ? 'OWNER' : getRolesLabel(member) }}
                  </p>
                </div>
              </div>
            </div>
          }

          <!-- Loading more indicator -->
          @if (loadingMore) {
            <div class="p-4 text-center">
              <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p class="text-xs text-neutral-500 mt-2">Loading more...</p>
            </div>
          }

          <!-- End of list indicator -->
          @if (!hasMore && members.length > 0) {
            <div class="p-4 text-center text-xs text-neutral-400">
              All {{ members.length }} members loaded
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class MemberListComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  @Input() members: DisplayMember[] = [];
  @Input() selectedMemberId: string | undefined;
  @Input() searchText = '';
  @Input() activeTab: TeamTab = 'team_member';
  @Input() loading = false;
  @Input() loadingMore = false;
  @Input() hasMore = true;

  @Output() memberSelected = new EventEmitter<DisplayMember>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<void>();

  private scrollThreshold = 100; // pixels from bottom to trigger load more

  ngAfterViewInit(): void {
    // Initial check if content doesn't fill the container
    setTimeout(() => this.checkIfNeedMoreContent(), 100);
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLDivElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    // Check if scrolled near bottom
    if (scrollHeight - scrollTop - clientHeight < this.scrollThreshold) {
      if (!this.loadingMore && this.hasMore) {
        this.loadMore.emit();
      }
    }
  }

  private checkIfNeedMoreContent(): void {
    if (!this.scrollContainer?.nativeElement) return;

    const container = this.scrollContainer.nativeElement;
    // If content doesn't fill the container and there's more data, load more
    if (container.scrollHeight <= container.clientHeight && this.hasMore && !this.loadingMore) {
      this.loadMore.emit();
    }
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getRoleLabel(roleKey: string, status: string): string {
    if (status === 'Invited') return 'INVITED';
    if (roleKey === 'expert') return 'TEAM MEMBER';
    return roleKey.toUpperCase();
  }

  /**
   * Get display label for all member roles
   * Shows primary role + count if multiple roles
   */
  getRolesLabel(member: DisplayMember): string {
    if (member.status === 'Invited') return 'INVITED';

    const roleKeys = member.roleKeys || [member.roleKey];
    if (roleKeys.length === 0) return 'MEMBER';

    // Get primary role label
    const primaryKey = roleKeys[0];
    let primaryLabel = primaryKey === 'expert' ? 'TEAM MEMBER' : primaryKey.toUpperCase();

    // Show additional roles count if more than one
    if (roleKeys.length > 1) {
      primaryLabel += ` +${roleKeys.length - 1}`;
    }

    return primaryLabel;
  }
}
