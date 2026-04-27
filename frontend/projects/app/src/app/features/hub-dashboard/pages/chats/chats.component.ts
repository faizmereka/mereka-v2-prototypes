import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HubChatService } from '../../services/hub-chat.service';
import { ChatSocketService } from '../../services/chat-socket.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import {
  ChatMessageListComponent,
  ChatInputComponent,
  ChatRoomListItemComponent,
  TypingIndicatorComponent,
} from '../../../../shared/components/chat';
import { AssignMemberModalComponent } from './components/assign-member-modal';
import type { ChatFilter, ChatRoomListItem, TypingUser } from '@mereka/models';

type ContextType = 'EXPERTISE' | 'EXPERIENCE' | 'BOOKING' | 'JOB' | 'CONTRACT';

/**
 * HubChatsComponent - Hub Dashboard Chat Inbox
 *
 * @spec specs/messaging/messaging-fe-hub-inbox_spec.md
 * @covers AC-FEH-001 through AC-FEH-092
 */
@Component({
  selector: 'app-hub-chats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatMessageListComponent,
    ChatInputComponent,
    ChatRoomListItemComponent,
    TypingIndicatorComponent,
    AssignMemberModalComponent,
  ],
  templateUrl: './chats.component.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    @media (max-width: 1023px) {
      :host {
        height: calc(100vh - 14px - 60px); /* viewport - mobile header - bottom nav */
      }
    }
  `],
})
export class HubChatsComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(HubChatService);
  private readonly socketService = inject(ChatSocketService);
  private readonly authState = inject(AuthStateService);

  // ============================================================================
  // State from service (readonly)
  // ============================================================================

  readonly rooms = this.chatService.filteredRooms;
  readonly messages = this.chatService.messages;
  readonly selectedRoomId = this.chatService.selectedRoomId;
  readonly selectedRoom = this.chatService.selectedRoom;
  readonly totalUnread = this.chatService.totalUnread;
  readonly roomsLoading = this.chatService.roomsLoading;
  readonly messagesLoading = this.chatService.messagesLoading;
  readonly sendingMessage = this.chatService.sendingMessage;
  readonly hasMoreMessages = this.chatService.hasMoreMessages;
  readonly typingUsers = this.chatService.typingUsersForSelectedRoom;
  readonly filterCounts = this.chatService.filterCounts;
  readonly contextCounts = this.chatService.contextCounts;
  readonly socketConnected = this.socketService.connected;
  readonly socketReconnecting = this.socketService.reconnecting;

  // Upload progress
  readonly uploading = this.chatService.uploading;
  readonly uploadProgress = this.chatService.uploadProgress;

  // ============================================================================
  // Local UI State
  // ============================================================================

  readonly showMobileList = signal(true);
  readonly searchText = signal('');
  readonly activeFilter = signal<ChatFilter>('all');
  readonly activeContextFilter = signal<string | null>(null);
  readonly showContextFilters = signal(false);
  readonly showAssignModal = signal(false);
  readonly showActionsMenu = signal(false);
  readonly showParticipants = signal(false);
  readonly actionLoading = signal<string | null>(null);

  // @covers AC-FEH-010
  readonly filters: { value: ChatFilter; label: string }[] = [
    { value: 'all', label: 'All Chats' },
    { value: 'unread', label: 'Unread' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'unassigned', label: 'Unassigned' },
  ];

  // @covers AC-FEH-014 - Context sub-filters
  readonly contextFilters: { value: ContextType; label: string; icon: string }[] = [
    { value: 'EXPERTISE', label: 'Expertises', icon: '🎓' },
    { value: 'EXPERIENCE', label: 'Experiences', icon: '🎯' },
    { value: 'BOOKING', label: 'Bookings', icon: '📅' },
    { value: 'JOB', label: 'Jobs', icon: '💼' },
    { value: 'CONTRACT', label: 'Contracts', icon: '📝' },
  ];

  // Get current user ID for message ownership
  readonly currentUserId = computed(() => {
    return this.authState.user()?.id ?? '';
  });

  // Typing users as array for TypingIndicator component
  readonly typingUsersArray = computed<TypingUser[]>(() => {
    const users = this.typingUsers();
    if (users.length === 0) return [];
    return users.map((u) => ({ userId: u.userId, name: u.userName }));
  });

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // @covers AC-FEH-060
  ngOnInit(): void {
    this.loadInbox();
    this.connectSocket();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  // ============================================================================
  // Data Loading
  // ============================================================================

  async loadInbox(): Promise<void> {
    await Promise.all([
      this.chatService.loadRooms(),
      this.chatService.getTotalUnread(),
      this.chatService.getFilterCounts(),
    ]);
  }

  async connectSocket(): Promise<void> {
    await this.socketService.connect();
  }

  // ============================================================================
  // Filter Methods
  // ============================================================================

  // @covers AC-FEH-012
  setFilter(filter: ChatFilter): void {
    this.activeFilter.set(filter);
    this.chatService.setFilter(filter);
  }

  // @covers AC-FEH-015, AC-FEH-016
  onSearchChange(search: string): void {
    this.searchText.set(search);
    this.chatService.setSearch(search);
  }

  // @covers AC-FEH-014 - Toggle context sub-filters visibility
  toggleContextFilters(): void {
    this.showContextFilters.update((v) => !v);
  }

  // @covers AC-FEH-014 - Set context filter
  setContextFilter(context: string | null): void {
    this.activeContextFilter.set(context);
    this.chatService.setContextFilter(context);
  }

  // ============================================================================
  // Room Selection
  // ============================================================================

  // @covers AC-FEH-023
  async selectRoom(roomItem: ChatRoomListItem): Promise<void> {
    this.showMobileList.set(false);
    await this.chatService.selectRoom(roomItem.room._id);

    // Join socket room for real-time updates
    this.socketService.joinRoom(roomItem.room._id);
  }

  // @covers AC-FEH-004
  backToList(): void {
    this.showMobileList.set(true);
    this.chatService.clearSelectedRoom();

    if (this.selectedRoomId()) {
      this.socketService.leaveRoom(this.selectedRoomId()!);
    }
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  // @covers AC-FEH-070, AC-FEH-071
  async sendMessage(data: { text: string; files?: File[] }): Promise<void> {
    await this.chatService.sendMessage(data.text, data.files);
  }

  // @covers AC-FEH-073
  onTyping(isTyping: boolean): void {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    if (isTyping) {
      this.socketService.sendTypingStart(roomId);
    } else {
      this.socketService.sendTypingStop(roomId);
    }
  }

  // @covers AC-FEH-024
  onLoadMoreMessages(): void {
    this.chatService.loadMoreMessages();
  }

  // ============================================================================
  // Actions
  // ============================================================================

  // @covers AC-FEH-040 through AC-FEH-044
  openAssignModal(): void {
    this.showAssignModal.set(true);
  }

  closeAssignModal(): void {
    this.showAssignModal.set(false);
  }

  // @covers AC-FEH-050
  async assignToSelf(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    await this.chatService.assignToSelf(roomId);
  }

  // @covers AC-FEH-043
  async unassign(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    await this.chatService.unassign(roomId);
  }

  // @covers AC-FEH-050 - Join room
  async joinRoom(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    this.actionLoading.set('join');
    await this.chatService.joinRoom(roomId);
    this.socketService.joinRoom(roomId);
    this.actionLoading.set(null);
  }

  // @covers AC-FEH-051 - Archive room
  async archiveRoom(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    this.actionLoading.set('archive');
    await this.chatService.archiveRoom(roomId);
    this.actionLoading.set(null);
    this.showActionsMenu.set(false);
  }

  // @covers AC-FEH-052 - Unarchive room
  async unarchiveRoom(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    this.actionLoading.set('unarchive');
    await this.chatService.unarchiveRoom(roomId);
    this.actionLoading.set(null);
    this.showActionsMenu.set(false);
  }

  // @covers AC-FEH-053 - Mute room
  async muteRoom(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    this.actionLoading.set('mute');
    await this.chatService.muteRoom(roomId);
    this.actionLoading.set(null);
    this.showActionsMenu.set(false);
  }

  // @covers AC-FEH-053 - Unmute room
  async unmuteRoom(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    this.actionLoading.set('unmute');
    await this.chatService.unmuteRoom(roomId);
    this.actionLoading.set(null);
    this.showActionsMenu.set(false);
  }

  toggleActionsMenu(): void {
    this.showActionsMenu.update((v) => !v);
  }

  closeActionsMenu(): void {
    this.showActionsMenu.set(false);
  }

  // @covers AC-FEH-031 - Toggle participant list
  toggleParticipants(): void {
    this.showParticipants.update((v) => !v);
  }

  // ============================================================================
  // UI Helpers
  // ============================================================================

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  isRoomActive(roomItem: ChatRoomListItem): boolean {
    return roomItem.room._id === this.selectedRoomId();
  }
}
