import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ToastService } from '@mereka/ui';
import { ChatUploadService } from '../../../shared/services/chat-upload.service';
import type {
  ChatRoom,
  ChatRoomListItem,
  ChatRoomListResponse,
  ChatMessage,
  ChatMessagesResponse,
  SendMessageResponse,
  ChatFile,
} from '@mereka/models';

// ============================================================================
// API Response Types
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Learner Chat Service - Handles learner chat inbox data
 *
 * @spec specs/messaging/messaging-fe-learner-inbox_spec.md
 * @covers AC-FEL-001 through AC-FEL-063
 *
 * Key differences from Hub Chat Service:
 * - No filters (all, assigned, unassigned)
 * - No assignment features
 * - Privacy: Hub team member names/avatars are hidden
 */
@Injectable({ providedIn: 'root' })
export class LearnerChatService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);
  private readonly uploadService = inject(ChatUploadService);

  private readonly apiUrl = `${environment.apiUrl}/learner/chat`;

  // Expose upload progress for UI
  readonly uploadProgress = this.uploadService.totalProgress;
  readonly uploading = this.uploadService.uploading;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _rooms = signal<ChatRoomListItem[]>([]);
  private readonly _selectedRoomId = signal<string | null>(null);
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _messagesCursor = signal<string | null>(null);
  private readonly _hasMoreMessages = signal(false);
  private readonly _searchText = signal('');

  // Loading states
  private readonly _roomsLoading = signal(false);
  private readonly _messagesLoading = signal(false);
  private readonly _sendingMessage = signal(false);
  private readonly _error = signal<string | null>(null);

  // Total unread
  private readonly _totalUnread = signal(0);

  // Typing indicators
  private readonly _typingUsers = signal<Map<string, { hubName: string }>>(new Map());

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly rooms = this._rooms.asReadonly();
  readonly selectedRoomId = this._selectedRoomId.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly hasMoreMessages = this._hasMoreMessages.asReadonly();
  readonly searchText = this._searchText.asReadonly();
  readonly roomsLoading = this._roomsLoading.asReadonly();
  readonly messagesLoading = this._messagesLoading.asReadonly();
  readonly sendingMessage = this._sendingMessage.asReadonly();
  readonly error = this._error.asReadonly();
  readonly totalUnread = this._totalUnread.asReadonly();
  readonly typingUsers = this._typingUsers.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasRooms = computed(() => this._rooms().length > 0);

  readonly selectedRoom = computed(() => {
    const roomId = this._selectedRoomId();
    if (!roomId) return null;
    return this._rooms().find((r) => r.room._id === roomId) ?? null;
  });

  // @covers AC-FEL-020, AC-FEL-021, AC-FEL-022 - Search filtering
  readonly filteredRooms = computed(() => {
    const rooms = this._rooms();
    const search = this._searchText().toLowerCase();

    if (!search) return rooms;

    return rooms.filter(
      (r) =>
        r.room.hubSnapshot.name.toLowerCase().includes(search) ||
        r.room.contextSnapshot?.title?.toLowerCase().includes(search)
    );
  });

  readonly typingForSelectedRoom = computed(() => {
    const roomId = this._selectedRoomId();
    if (!roomId) return null;
    return this._typingUsers().get(roomId) ?? null;
  });

  // ============================================================================
  // Search Methods
  // ============================================================================

  setSearch(search: string): void {
    this._searchText.set(search);
  }

  // ============================================================================
  // Room Selection
  // ============================================================================

  async selectRoom(roomId: string): Promise<void> {
    if (this._selectedRoomId() === roomId) return;

    this._selectedRoomId.set(roomId);
    this._messages.set([]);
    this._messagesCursor.set(null);
    this._hasMoreMessages.set(false);

    await this.loadMessages(roomId);
    await this.markAsRead(roomId);
  }

  clearSelectedRoom(): void {
    this._selectedRoomId.set(null);
    this._messages.set([]);
    this._messagesCursor.set(null);
    this._hasMoreMessages.set(false);
  }

  // ============================================================================
  // Room List Methods
  // ============================================================================

  async loadRooms(): Promise<void> {
    if (this._roomsLoading()) return;

    this._roomsLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ChatRoomListResponse>>(
          `${this.apiUrl}/rooms`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._rooms.set(response.data.rooms);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load conversations');
      }
    } catch (error) {
      console.error('Failed to fetch chat rooms:', error);
      this._error.set('Failed to load conversations');
    } finally {
      this._roomsLoading.set(false);
    }
  }

  async refreshRooms(): Promise<void> {
    await this.loadRooms();
  }

  // ============================================================================
  // Message Methods
  // ============================================================================

  async loadMessages(roomId: string): Promise<void> {
    this._messagesLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ChatMessagesResponse>>(
          `${this.apiUrl}/rooms/${roomId}/messages`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Transform messages for privacy (hide individual hub member names)
        const transformedMessages = this.transformMessagesForPrivacy(
          response.data.messages.reverse(),
          roomId
        );
        this._messages.set(transformedMessages);
        this._messagesCursor.set(response.data.cursor ?? null);
        this._hasMoreMessages.set(response.data.hasMore);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load messages');
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      this._error.set('Failed to load messages');
    } finally {
      this._messagesLoading.set(false);
    }
  }

  async loadMoreMessages(): Promise<void> {
    const roomId = this._selectedRoomId();
    const cursor = this._messagesCursor();

    if (!roomId || !cursor || this._messagesLoading()) return;

    this._messagesLoading.set(true);

    try {
      const params = new HttpParams().set('cursor', cursor);

      const response = await firstValueFrom(
        this.http.get<ApiResponse<ChatMessagesResponse>>(
          `${this.apiUrl}/rooms/${roomId}/messages`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        const transformedMessages = this.transformMessagesForPrivacy(
          response.data.messages.reverse(),
          roomId
        );
        this._messages.update((existing) => [...transformedMessages, ...existing]);
        this._messagesCursor.set(response.data.cursor ?? null);
        this._hasMoreMessages.set(response.data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      this._messagesLoading.set(false);
    }
  }

  // @covers AC-FEL-042, AC-FEL-043 - Optimistic updates with retry
  async sendMessage(text: string, files?: File[]): Promise<boolean> {
    const roomId = this._selectedRoomId();
    const user = this.authState.user();

    // Either text or files must be provided
    if (!roomId || (!text.trim() && (!files || files.length === 0))) return false;

    this._sendingMessage.set(true);

    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const hasFiles = files && files.length > 0;
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      roomId,
      sender: {
        userId: user?.id ?? '',
        name: user?.name ?? 'You',
        avatar: user?.profilePhoto,
        type: 'LEARNER',
      },
      type: hasFiles ? 'FILE' : 'TEXT',
      text: text.trim() || undefined,
      files: hasFiles ? files.map((f) => ({
        name: f.name,
        url: '', // Will be replaced after upload
        mimeType: f.type,
        sizeBytes: f.size,
      })) : undefined,
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };

    this._messages.update((msgs) => [...msgs, optimisticMessage]);

    try {
      // Upload files to Firebase first if any
      let uploadedFiles: ChatFile[] | undefined;
      if (hasFiles) {
        uploadedFiles = await this.uploadService.uploadChatFiles(files, roomId);
        if (uploadedFiles.length === 0 && files.length > 0) {
          // All uploads failed
          throw new Error('Failed to upload files');
        }
      }

      // Send message with file URLs to backend
      const requestBody: { text?: string; files?: ChatFile[] } = {};
      if (text.trim()) {
        requestBody.text = text.trim();
      }
      if (uploadedFiles && uploadedFiles.length > 0) {
        requestBody.files = uploadedFiles;
      }

      const response = await firstValueFrom(
        this.http.post<ApiResponse<SendMessageResponse>>(
          `${this.apiUrl}/rooms/${roomId}/messages`,
          requestBody,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // API returns message directly in response.data (not response.data.data)
        const message = response.data as unknown as ChatMessage;
        this._messages.update((msgs) =>
          msgs.map((m) => (m._id === tempId ? message : m))
        );
        this.updateRoomLastMessage(roomId, message);
        this.uploadService.reset();
        return true;
      }

      // Mark as failed
      this._messages.update((msgs) =>
        msgs.map((m) =>
          m._id === tempId ? { ...m, _failed: true, _tempId: tempId } as ChatMessage & { _failed: boolean; _tempId: string } : m
        )
      );
      this.toast.error('Failed to send message');
      return false;
    } catch (error) {
      console.error('Failed to send message:', error);
      this._messages.update((msgs) =>
        msgs.map((m) =>
          m._id === tempId ? { ...m, _failed: true, _tempId: tempId } as ChatMessage & { _failed: boolean; _tempId: string } : m
        )
      );
      this.toast.error('Failed to send message');
      return false;
    } finally {
      this._sendingMessage.set(false);
      this.uploadService.reset();
    }
  }

  async retryMessage(tempId: string): Promise<boolean> {
    const failedMessage = this._messages().find((m) => m._id === tempId);
    if (!failedMessage || !failedMessage.text) return false;

    this._messages.update((msgs) => msgs.filter((m) => m._id !== tempId));
    return this.sendMessage(failedMessage.text);
  }

  removeFailedMessage(tempId: string): void {
    this._messages.update((msgs) => msgs.filter((m) => m._id !== tempId));
  }

  // ============================================================================
  // Read State Methods
  // ============================================================================

  async markAsRead(roomId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.apiUrl}/rooms/${roomId}/read`,
          {},
          { withCredentials: true }
        )
      );

      this._rooms.update((rooms) =>
        rooms.map((r) =>
          r.room._id === roomId
            ? { ...r, userState: { ...r.userState, unreadCount: 0 } }
            : r
        )
      );

      this.recalculateTotalUnread();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  async getTotalUnread(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ total: number }>>(
          `${this.apiUrl}/unread/total`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._totalUnread.set(response.data.total);
      }
    } catch (error) {
      console.error('Failed to get total unread:', error);
    }
  }

  // ============================================================================
  // Archive/Mute Methods
  // ============================================================================

  async archiveRoom(roomId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.apiUrl}/rooms/${roomId}/archive`,
          {},
          { withCredentials: true }
        )
      );

      if (response.success) {
        this._rooms.update((rooms) =>
          rooms.map((r) =>
            r.room._id === roomId
              ? { ...r, isArchived: true, userState: { ...r.userState, isArchived: true } }
              : r
          )
        );
        this.toast.success('Conversation archived');
        return true;
      }
      this.toast.error('Failed to archive conversation');
      return false;
    } catch (error) {
      console.error('Failed to archive room:', error);
      this.toast.error('Failed to archive conversation');
      return false;
    }
  }

  async unarchiveRoom(roomId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.apiUrl}/rooms/${roomId}/unarchive`,
          {},
          { withCredentials: true }
        )
      );

      if (response.success) {
        this._rooms.update((rooms) =>
          rooms.map((r) =>
            r.room._id === roomId
              ? { ...r, isArchived: false, userState: { ...r.userState, isArchived: false } }
              : r
          )
        );
        this.toast.success('Conversation unarchived');
        return true;
      }
      this.toast.error('Failed to unarchive conversation');
      return false;
    } catch (error) {
      console.error('Failed to unarchive room:', error);
      this.toast.error('Failed to unarchive conversation');
      return false;
    }
  }

  async muteRoom(roomId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.apiUrl}/rooms/${roomId}/mute`,
          {},
          { withCredentials: true }
        )
      );

      if (response.success) {
        this._rooms.update((rooms) =>
          rooms.map((r) =>
            r.room._id === roomId
              ? { ...r, isMuted: true, userState: { ...r.userState, isMuted: true } }
              : r
          )
        );
        this.toast.success('Notifications muted');
        return true;
      }
      this.toast.error('Failed to mute notifications');
      return false;
    } catch (error) {
      console.error('Failed to mute room:', error);
      this.toast.error('Failed to mute notifications');
      return false;
    }
  }

  async unmuteRoom(roomId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.apiUrl}/rooms/${roomId}/unmute`,
          {},
          { withCredentials: true }
        )
      );

      if (response.success) {
        this._rooms.update((rooms) =>
          rooms.map((r) =>
            r.room._id === roomId
              ? { ...r, isMuted: false, userState: { ...r.userState, isMuted: false } }
              : r
          )
        );
        this.toast.success('Notifications unmuted');
        return true;
      }
      this.toast.error('Failed to unmute notifications');
      return false;
    } catch (error) {
      console.error('Failed to unmute room:', error);
      this.toast.error('Failed to unmute notifications');
      return false;
    }
  }

  // ============================================================================
  // Real-time Update Methods (called by ChatSocketService)
  // ============================================================================

  handleNewMessage(message: ChatMessage): void {
    const roomId = message.roomId;
    const currentUserId = this.authState.user()?.id;

    console.log('[LearnerChatService] handleNewMessage called', {
      messageRoomId: roomId,
      selectedRoomId: this._selectedRoomId(),
      isMatch: roomId === this._selectedRoomId(),
      senderId: message.sender.userId,
      currentUserId,
      isOwnMessage: message.sender.userId === currentUserId,
    });

    const room = this._rooms().find((r) => r.room._id === roomId);

    // Transform for privacy if from hub team
    const transformedMessage = room
      ? this.transformMessageForPrivacy(message, room.room.hubSnapshot.name)
      : message;

    if (roomId === this._selectedRoomId()) {
      // Skip messages from current user - we handle those via optimistic update + API response
      // This prevents duplicates when socket broadcasts our own message
      const isOwnMessage = message.sender.userId === currentUserId;

      if (isOwnMessage) {
        console.log('[LearnerChatService] Skipping own message from socket (handled via API response)');
        // Don't add to messages array, but continue to update room list below
      } else {
        // Check if message already exists (to avoid duplicate)
        const existingIds = this._messages().map(m => m._id);
        if (!existingIds.includes(message._id)) {
          console.log('[LearnerChatService] Adding message to messages array');
          this._messages.update((msgs) => [...msgs, transformedMessage]);
        } else {
          console.log('[LearnerChatService] Message already exists, skipping duplicate');
        }
      }
    }

    this._rooms.update((rooms) =>
      rooms.map((r) => {
        if (r.room._id === roomId) {
          const isSelected = roomId === this._selectedRoomId();
          return {
            ...r,
            room: {
              ...r.room,
              lastMessage: {
                _id: message._id,
                preview: message.text ?? '[File]',
                sentAt: message.createdAt,
                senderName: message.sender.type === 'HUB_TEAM' ? r.room.hubSnapshot.name : message.sender.name,
              },
            },
            userState: {
              ...r.userState,
              unreadCount: isSelected ? 0 : r.userState.unreadCount + 1,
            },
          };
        }
        return r;
      })
    );

    this.recalculateTotalUnread();
  }

  handleTypingStart(roomId: string, hubName: string): void {
    this._typingUsers.update((map) => {
      const newMap = new Map(map);
      newMap.set(roomId, { hubName });
      return newMap;
    });
  }

  handleTypingStop(roomId: string): void {
    this._typingUsers.update((map) => {
      const newMap = new Map(map);
      newMap.delete(roomId);
      return newMap;
    });
  }

  handleUnreadUpdate(roomId: string, count: number): void {
    this._rooms.update((rooms) =>
      rooms.map((r) =>
        r.room._id === roomId
          ? { ...r, userState: { ...r.userState, unreadCount: count } }
          : r
      )
    );
    this.recalculateTotalUnread();
  }

  handleMessageDeleted(roomId: string, messageId: string): void {
    if (roomId === this._selectedRoomId()) {
      this._messages.update((msgs) =>
        msgs.map((m) => (m._id === messageId ? { ...m, isDeleted: true } : m))
      );
    }
  }

  // ============================================================================
  // Privacy Transform Methods
  // @covers AC-FEL-060 through AC-FEL-063
  // ============================================================================

  private transformMessagesForPrivacy(messages: ChatMessage[], roomId: string): ChatMessage[] {
    const room = this._rooms().find((r) => r.room._id === roomId);
    if (!room) return messages;

    const hubName = room.room.hubSnapshot.name;
    return messages.map((m) => this.transformMessageForPrivacy(m, hubName));
  }

  private transformMessageForPrivacy(message: ChatMessage, hubName: string): ChatMessage {
    if (message.sender.type === 'HUB_TEAM') {
      return {
        ...message,
        sender: {
          ...message.sender,
          name: hubName, // Show hub name instead of individual name
          avatar: undefined, // Don't show individual avatar
        },
      };
    }
    return message;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private updateRoomLastMessage(roomId: string, message: ChatMessage): void {
    this._rooms.update((rooms) =>
      rooms.map((r) =>
        r.room._id === roomId
          ? {
              ...r,
              room: {
                ...r.room,
                lastMessage: {
                  _id: message._id,
                  preview: message.text ?? '[File]',
                  sentAt: message.createdAt,
                  senderName: message.sender.name,
                },
              },
            }
          : r
      )
    );
  }

  private recalculateTotalUnread(): void {
    const total = this._rooms().reduce(
      (sum, r) => sum + r.userState.unreadCount,
      0
    );
    this._totalUnread.set(total);
  }

  clearCache(): void {
    this._rooms.set([]);
    this._selectedRoomId.set(null);
    this._messages.set([]);
    this._messagesCursor.set(null);
    this._hasMoreMessages.set(false);
    this._searchText.set('');
    this._totalUnread.set(0);
    this._typingUsers.set(new Map());
    this._error.set(null);
  }
}
