import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LearnerChatService } from '../../services/learner-chat.service';
import { ChatSocketService } from '../../../hub-dashboard/services/chat-socket.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import {
  ChatMessageListComponent,
  ChatInputComponent,
  TypingIndicatorComponent,
} from '../../../../shared/components/chat';
import type { ChatRoomListItem, TypingUser } from '@mereka/models';

/**
 * LearnerChatsComponent - Learner Dashboard Chat Inbox
 *
 * @spec specs/messaging/messaging-fe-learner-inbox_spec.md
 * @covers AC-FEL-001 through AC-FEL-063
 */
@Component({
  selector: 'app-learner-chats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatMessageListComponent,
    ChatInputComponent,
    TypingIndicatorComponent,
  ],
  templateUrl: './chats.component.html',
  styles: [`
    :host {
      display: block;
      height: calc(100vh - 68px - 40px); /* viewport - navbar - dashboard padding */
      margin: -24px; /* Counteract dashboard-content padding (p-6 = 24px) */
    }
    @media (max-width: 1023px) {
      :host {
        height: 100vh;
        margin: 0;
        position: fixed;
        inset: 0;
        z-index: 20;
        background: white;
      }
    }
  `],
})
export class LearnerChatsComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(LearnerChatService);
  private readonly socketService = inject(ChatSocketService);
  private readonly authState = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);

  // Track if we have a pending room to select from query param
  private pendingRoomId: string | null = null;

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
  readonly typingForRoom = this.chatService.typingForSelectedRoom;
  readonly socketConnected = this.socketService.connected;
  readonly socketReconnecting = this.socketService.reconnecting;

  // Upload progress
  readonly uploading = this.chatService.uploading;
  readonly uploadProgress = this.chatService.uploadProgress;

  // ============================================================================
  // Local UI State
  // ============================================================================

  readonly searchText = signal('');
  readonly showActionsMenu = signal(false);
  readonly actionLoading = signal<string | null>(null);

  // Get current user ID for message ownership
  readonly currentUserId = computed(() => {
    return this.authState.user()?.id ?? '';
  });

  // Typing users as array for TypingIndicator component
  readonly typingUsersArray = computed<TypingUser[]>(() => {
    const typing = this.typingForRoom();
    if (!typing) return [];
    return [{ userId: 'hub', name: typing.hubName }];
  });

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    // Check for ?room=xxx query param to auto-select a room
    const roomId = this.route.snapshot.queryParamMap.get('room');
    if (roomId) {
      this.pendingRoomId = roomId;
    }

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
    ]);

    // Auto-select room from query param if present
    if (this.pendingRoomId) {
      await this.selectRoomById(this.pendingRoomId);
      this.pendingRoomId = null;
    }
  }

  /**
   * Select a room by its ID
   * Used for query param deep linking (?room=xxx)
   */
  async selectRoomById(roomId: string): Promise<void> {
    await this.chatService.selectRoom(roomId);
    this.socketService.joinRoom(roomId);
  }

  async connectSocket(): Promise<void> {
    await this.socketService.connect();
  }

  // @covers AC-FEL-016 - Pull to refresh
  async onRefresh(): Promise<void> {
    await this.chatService.refreshRooms();
  }

  // ============================================================================
  // Search
  // @covers AC-FEL-020, AC-FEL-021, AC-FEL-022
  // ============================================================================

  onSearchChange(search: string): void {
    this.searchText.set(search);
    this.chatService.setSearch(search);
  }

  // ============================================================================
  // Room Selection
  // @covers AC-FEL-004, AC-FEL-005
  // ============================================================================

  async selectRoom(roomItem: ChatRoomListItem): Promise<void> {
    await this.chatService.selectRoom(roomItem.room._id);
    this.socketService.joinRoom(roomItem.room._id);
  }

  // @covers AC-FEL-032 - Back button
  backToList(): void {
    if (this.selectedRoomId()) {
      this.socketService.leaveRoom(this.selectedRoomId()!);
    }
    this.chatService.clearSelectedRoom();
  }

  // ============================================================================
  // Messaging
  // @covers AC-FEL-040, AC-FEL-041, AC-FEL-042, AC-FEL-043
  // ============================================================================

  async sendMessage(data: { text: string; files?: File[] }): Promise<void> {
    await this.chatService.sendMessage(data.text, data.files);
  }

  onTyping(isTyping: boolean): void {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    if (isTyping) {
      this.socketService.sendTypingStart(roomId);
    } else {
      this.socketService.sendTypingStop(roomId);
    }
  }

  onLoadMoreMessages(): void {
    this.chatService.loadMoreMessages();
  }

  // ============================================================================
  // Actions
  // @covers AC-FEL-033
  // ============================================================================

  toggleActionsMenu(): void {
    this.showActionsMenu.update((v) => !v);
  }

  closeActionsMenu(): void {
    this.showActionsMenu.set(false);
  }

  async archiveRoom(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    this.actionLoading.set('archive');
    await this.chatService.archiveRoom(roomId);
    this.actionLoading.set(null);
    this.showActionsMenu.set(false);
  }

  async unarchiveRoom(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    this.actionLoading.set('unarchive');
    await this.chatService.unarchiveRoom(roomId);
    this.actionLoading.set(null);
    this.showActionsMenu.set(false);
  }

  async muteRoom(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    this.actionLoading.set('mute');
    await this.chatService.muteRoom(roomId);
    this.actionLoading.set(null);
    this.showActionsMenu.set(false);
  }

  async unmuteRoom(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (!roomId) return;

    this.actionLoading.set('unmute');
    await this.chatService.unmuteRoom(roomId);
    this.actionLoading.set(null);
    this.showActionsMenu.set(false);
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

  getContextLabel(room: ChatRoomListItem['room']): string {
    const contextType = room.contextType;
    const title = room.contextSnapshot?.title ?? '';

    switch (contextType) {
      case 'EXPERTISE':
        return `About: ${title}`;
      case 'BOOKING':
        return `Booking: ${title}`;
      case 'JOB':
        return `Job: ${title}`;
      case 'CONTRACT':
        return `Contract: ${title}`;
      default:
        return title;
    }
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
}
