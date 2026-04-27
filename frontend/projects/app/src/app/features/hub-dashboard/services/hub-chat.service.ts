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
  ChatFilter,
  ChatUserState,
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

// ============================================================================
// Default Values
// ============================================================================

interface ChatFilterState {
  filter: ChatFilter;
  search: string;
  context: string | null;
}

const DEFAULT_FILTER_STATE: ChatFilterState = {
  filter: 'all',
  search: '',
  context: null,
};

interface ChatPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const DEFAULT_PAGINATION: ChatPagination = {
  page: 1,
  limit: 20,
  total: 0,
  hasMore: false,
};

// ============================================================================
// Hub Chat Service
// ============================================================================

/**
 * Hub Chat Service - Handles hub chat inbox data with signal-based state management
 *
 * Features:
 * - Signal-based reactive state
 * - Room list management
 * - Message pagination
 * - Unread count tracking
 * - Real-time update integration
 */
@Injectable({ providedIn: 'root' })
export class HubChatService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);
  private readonly uploadService = inject(ChatUploadService);

  // Expose upload progress for UI
  readonly uploadProgress = this.uploadService.totalProgress;
  readonly uploading = this.uploadService.uploading;

  // Base URL pattern: /hub/:hubId/chat
  private getApiUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/chat`;
  }

  // ============================================================================
  // State Signals
  // ============================================================================

  // Room list
  private readonly _rooms = signal<ChatRoomListItem[]>([]);
  private readonly _roomsPagination = signal<ChatPagination>(DEFAULT_PAGINATION);
  private readonly _selectedRoomId = signal<string | null>(null);

  // Messages for selected room
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _messagesCursor = signal<string | null>(null);
  private readonly _hasMoreMessages = signal(false);

  // Filter state
  private readonly _filters = signal<ChatFilterState>(DEFAULT_FILTER_STATE);

  // Loading states
  private readonly _roomsLoading = signal(false);
  private readonly _messagesLoading = signal(false);
  private readonly _sendingMessage = signal(false);
  private readonly _error = signal<string | null>(null);

  // Total unread
  private readonly _totalUnread = signal(0);

  // Filter counts for sidebar badges (AC-FEH-011)
  private readonly _filterCounts = signal<{
    all: number;
    unread: number;
    assigned: number;
    unassigned: number;
  }>({ all: 0, unread: 0, assigned: 0, unassigned: 0 });

  // Context counts for sub-filters (AC-FEH-014)
  private readonly _contextCounts = signal<{
    EXPERTISE: number;
    EXPERIENCE: number;
    BOOKING: number;
    JOB: number;
    CONTRACT: number;
  }>({ EXPERTISE: 0, EXPERIENCE: 0, BOOKING: 0, JOB: 0, CONTRACT: 0 });

  // Typing indicators
  private readonly _typingUsers = signal<Map<string, { userId: string; userName: string }>>(new Map());

  // Cache tracking
  private readonly _cachedHubId = signal<string | null>(null);
  private readonly _initialized = signal(false);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly rooms = this._rooms.asReadonly();
  readonly roomsPagination = this._roomsPagination.asReadonly();
  readonly selectedRoomId = this._selectedRoomId.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly hasMoreMessages = this._hasMoreMessages.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly roomsLoading = this._roomsLoading.asReadonly();
  readonly messagesLoading = this._messagesLoading.asReadonly();
  readonly sendingMessage = this._sendingMessage.asReadonly();
  readonly error = this._error.asReadonly();
  readonly totalUnread = this._totalUnread.asReadonly();
  readonly filterCounts = this._filterCounts.asReadonly();
  readonly contextCounts = this._contextCounts.asReadonly();
  readonly typingUsers = this._typingUsers.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasRooms = computed(() => this._rooms().length > 0);

  readonly selectedRoom = computed(() => {
    const roomId = this._selectedRoomId();
    if (!roomId) return null;
    return this._rooms().find((r) => r.room._id === roomId) ?? null;
  });

  readonly filteredRooms = computed(() => {
    let rooms = this._rooms();
    const filters = this._filters();

    // Filter by type
    if (filters.filter === 'unread') {
      rooms = rooms.filter((r) => r.userState.unreadCount > 0);
    } else if (filters.filter === 'assigned') {
      rooms = rooms.filter((r) => r.assignedMember !== undefined);
    } else if (filters.filter === 'unassigned') {
      rooms = rooms.filter((r) => r.assignedMember === undefined);
    }

    // @covers AC-FEH-014 - Context sub-filter
    if (filters.context) {
      rooms = rooms.filter((r) => r.room.contextType === filters.context);
    }

    // Search filter
    const search = filters.search.toLowerCase();
    if (search) {
      rooms = rooms.filter(
        (r) =>
          r.room.learnerSnapshot?.name.toLowerCase().includes(search) ||
          r.room.contextSnapshot?.title?.toLowerCase().includes(search) ||
          r.room.lastMessage?.preview.toLowerCase().includes(search)
      );
    }

    return rooms;
  });

  readonly typingUsersForSelectedRoom = computed(() => {
    const roomId = this._selectedRoomId();
    if (!roomId) return [];
    const typing = this._typingUsers().get(roomId);
    return typing ? [typing] : [];
  });

  // ============================================================================
  // Filter Methods
  // ============================================================================

  setFilter(filter: ChatFilter): void {
    this._filters.update((f) => ({ ...f, filter }));
  }

  setSearch(search: string): void {
    this._filters.update((f) => ({ ...f, search }));
  }

  // @covers AC-FEH-014 - Context sub-filter
  setContextFilter(context: string | null): void {
    this._filters.update((f) => ({ ...f, context }));
  }

  resetFilters(): void {
    this._filters.set(DEFAULT_FILTER_STATE);
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

    // Load messages for the room
    await this.loadMessages(roomId);

    // Mark as read
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
    const currentHubId = this.authState.selectedHub()?.id;
    if (!currentHubId) {
      this._error.set('No hub selected');
      return;
    }

    // Clear cache if hub changed
    if (this._cachedHubId() !== currentHubId) {
      this.clearCache();
    }

    if (this._roomsLoading()) return;

    await this.fetchRooms();
  }

  async refreshRooms(): Promise<void> {
    this._roomsPagination.update((p) => ({ ...p, page: 1 }));
    await this.fetchRooms();
  }

  async loadMoreRooms(): Promise<void> {
    const pagination = this._roomsPagination();
    if (!pagination.hasMore || this._roomsLoading()) return;

    await this.fetchRooms(pagination.page + 1, true);
  }

  private async fetchRooms(page: number = 1, append: boolean = false): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    this._roomsLoading.set(true);
    this._error.set(null);

    try {
      const filters = this._filters();
      const pagination = this._roomsPagination();

      let params = new HttpParams()
        .set('page', page.toString())
        .set('limit', pagination.limit.toString());

      if (filters.filter !== 'all') {
        params = params.set('filter', filters.filter);
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<ChatRoomListResponse>>(
          `${this.getApiUrl(hubId)}/rooms`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        const data = response.data;

        if (append) {
          this._rooms.update((existing) => [...existing, ...data.rooms]);
        } else {
          this._rooms.set(data.rooms);
        }

        this._roomsPagination.set({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          hasMore: data.pagination.hasMore,
        });

        this._cachedHubId.set(hubId);
        this._initialized.set(true);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load chat rooms');
      }
    } catch (error) {
      console.error('Failed to fetch chat rooms:', error);
      this._error.set('Failed to load chat rooms');
    } finally {
      this._roomsLoading.set(false);
    }
  }

  // ============================================================================
  // Message Methods
  // ============================================================================

  async loadMessages(roomId: string): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    this._messagesLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ChatMessagesResponse>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/messages`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Messages come newest first, reverse for display
        this._messages.set(response.data.messages.reverse());
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
    const hubId = this.authState.selectedHub()?.id;

    if (!roomId || !cursor || !hubId || this._messagesLoading()) return;

    this._messagesLoading.set(true);

    try {
      const params = new HttpParams().set('cursor', cursor);

      const response = await firstValueFrom(
        this.http.get<ApiResponse<ChatMessagesResponse>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/messages`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Prepend older messages (reversed)
        const olderMessages = response.data.messages.reverse();
        this._messages.update((existing) => [...olderMessages, ...existing]);
        this._messagesCursor.set(response.data.cursor ?? null);
        this._hasMoreMessages.set(response.data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      this._messagesLoading.set(false);
    }
  }

  // @covers AC-FEH-071, AC-FEH-072 - Optimistic updates with retry support
  async sendMessage(text: string, files?: File[]): Promise<boolean> {
    const roomId = this._selectedRoomId();
    const hubId = this.authState.selectedHub()?.id;
    const user = this.authState.user();

    // Either text or files must be provided
    if (!roomId || !hubId || (!text.trim() && (!files || files.length === 0))) return false;

    this._sendingMessage.set(true);

    // @covers AC-FEH-071 - Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const hasFiles = files && files.length > 0;
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      roomId,
      sender: {
        userId: user?.id ?? '',
        name: user?.name ?? 'You',
        avatar: user?.profilePhoto,
        type: 'HUB_TEAM',
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

    // Add optimistic message immediately
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
          `${this.getApiUrl(hubId)}/rooms/${roomId}/messages`,
          requestBody,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Replace optimistic message with real one
        // API returns message directly in response.data (not response.data.data)
        const message = response.data as unknown as ChatMessage;
        this._messages.update((msgs) =>
          msgs.map((m) => (m._id === tempId ? message : m))
        );

        // Update the room's last message
        this.updateRoomLastMessage(roomId, message);
        this.uploadService.reset();

        return true;
      }

      // @covers AC-FEH-072 - Mark message as failed
      this._messages.update((msgs) =>
        msgs.map((m) =>
          m._id === tempId ? { ...m, _failed: true, _tempId: tempId } as ChatMessage & { _failed: boolean; _tempId: string } : m
        )
      );
      this.toast.error('Failed to send message');
      return false;
    } catch (error) {
      console.error('Failed to send message:', error);
      // @covers AC-FEH-072 - Mark message as failed for retry
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

  // @covers AC-FEH-072 - Retry failed message
  async retryMessage(tempId: string): Promise<boolean> {
    const failedMessage = this._messages().find((m) => m._id === tempId);
    if (!failedMessage || !failedMessage.text) return false;

    // Remove failed message and resend
    this._messages.update((msgs) => msgs.filter((m) => m._id !== tempId));
    return this.sendMessage(failedMessage.text);
  }

  // Remove failed message without retrying
  removeFailedMessage(tempId: string): void {
    this._messages.update((msgs) => msgs.filter((m) => m._id !== tempId));
  }

  // ============================================================================
  // Read State Methods
  // ============================================================================

  async markAsRead(roomId: string): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    try {
      await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/read`,
          {},
          { withCredentials: true }
        )
      );

      // Update local state
      this._rooms.update((rooms) =>
        rooms.map((r) =>
          r.room._id === roomId
            ? { ...r, userState: { ...r.userState, unreadCount: 0 } }
            : r
        )
      );

      // Recalculate total unread
      this.recalculateTotalUnread();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  async getTotalUnread(): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ total: number }>>(
          `${this.getApiUrl(hubId)}/unread/total`,
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

  // @covers AC-FEH-011 - Filter counts for sidebar badges
  async getFilterCounts(): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{
          all: number;
          unread: number;
          assigned: number;
          unassigned: number;
          contexts: {
            EXPERTISE: number;
            EXPERIENCE: number;
            BOOKING: number;
            JOB: number;
            CONTRACT: number;
          };
        }>>(
          `${this.getApiUrl(hubId)}/counts`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._filterCounts.set({
          all: response.data.all,
          unread: response.data.unread,
          assigned: response.data.assigned,
          unassigned: response.data.unassigned,
        });
        this._contextCounts.set(response.data.contexts);
      }
    } catch (error) {
      console.error('Failed to get filter counts:', error);
    }
  }

  // ============================================================================
  // Assignment Methods
  // ============================================================================

  async assignToSelf(roomId: string): Promise<boolean> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ participant: { userId: string; name: string; avatar?: string } }>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/assign`,
          {},
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        const p = response.data.participant;
        this._rooms.update((rooms) =>
          rooms.map((r) =>
            r.room._id === roomId
              ? { ...r, assignedMember: { memberId: p.userId, name: p.name, avatar: p.avatar } }
              : r
          )
        );
        this.toast.success('Assigned to you');
        return true;
      }
      this.toast.error('Failed to assign conversation');
      return false;
    } catch (error) {
      console.error('Failed to assign room:', error);
      this.toast.error('Failed to assign conversation');
      return false;
    }
  }

  async unassign(roomId: string): Promise<boolean> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<void>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/assign`,
          { withCredentials: true }
        )
      );

      if (response.success) {
        this._rooms.update((rooms) =>
          rooms.map((r) =>
            r.room._id === roomId
              ? { ...r, assignedMember: undefined }
              : r
          )
        );
        this.toast.success('Conversation unassigned');
        return true;
      }
      this.toast.error('Failed to unassign conversation');
      return false;
    } catch (error) {
      console.error('Failed to unassign room:', error);
      this.toast.error('Failed to unassign conversation');
      return false;
    }
  }

  // ============================================================================
  // Archive/Mute Methods
  // @covers AC-FEH-051 through AC-FEH-054
  // ============================================================================

  async archiveRoom(roomId: string): Promise<boolean> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/archive`,
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
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/unarchive`,
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
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/mute`,
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
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<void>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/unmute`,
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
  // Join Room Method
  // @covers AC-FEH-050
  // ============================================================================

  async joinRoom(roomId: string): Promise<boolean> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ participant: { userId: string; name: string } }>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/join`,
          {},
          { withCredentials: true }
        )
      );

      if (response.success) {
        this._rooms.update((rooms) =>
          rooms.map((r) =>
            r.room._id === roomId
              ? { ...r, isMember: true }
              : r
          )
        );
        this.toast.success('Joined conversation');
        return true;
      }
      this.toast.error('Failed to join conversation');
      return false;
    } catch (error) {
      console.error('Failed to join room:', error);
      this.toast.error('Failed to join conversation');
      return false;
    }
  }

  // ============================================================================
  // Hub Team Members (for assignment modal)
  // @covers AC-FEH-040
  // ============================================================================

  async getHubTeamMembers(): Promise<Array<{ userId: string; name: string; avatar?: string; email: string }>> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return [];

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ members: Array<{ userId: string; name: string; avatar?: string; email: string }> }>>(
          `${environment.apiUrl}/hub/${hubId}/team-members`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        return response.data.members;
      }
      return [];
    } catch (error) {
      console.error('Failed to get team members:', error);
      return [];
    }
  }

  async assignToMember(roomId: string, memberId: string): Promise<boolean> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ participant: { userId: string; name: string; avatar?: string } }>>(
          `${this.getApiUrl(hubId)}/rooms/${roomId}/assign`,
          { userId: memberId },
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        const p = response.data.participant;
        this._rooms.update((rooms) =>
          rooms.map((r) =>
            r.room._id === roomId
              ? { ...r, assignedMember: { memberId: p.userId, name: p.name, avatar: p.avatar } }
              : r
          )
        );
        this.toast.success(`Assigned to ${p.name}`);
        return true;
      }
      this.toast.error('Failed to assign conversation');
      return false;
    } catch (error) {
      console.error('Failed to assign to member:', error);
      this.toast.error('Failed to assign conversation');
      return false;
    }
  }

  // ============================================================================
  // Real-time Update Methods (called by ChatSocketService)
  // ============================================================================

  handleNewMessage(message: ChatMessage): void {
    const currentUserId = this.authState.user()?.id;

    console.log('[HubChatService] handleNewMessage called', {
      messageRoomId: message.roomId,
      selectedRoomId: this._selectedRoomId(),
      isMatch: message.roomId === this._selectedRoomId(),
      senderId: message.sender.userId,
      currentUserId,
      isOwnMessage: message.sender.userId === currentUserId,
    });

    // If message is for the selected room, add it (but avoid duplicates from optimistic updates)
    if (message.roomId === this._selectedRoomId()) {
      // Skip messages from current user - we handle those via optimistic update + API response
      // This prevents duplicates when socket broadcasts our own message
      const isOwnMessage = message.sender.userId === currentUserId;

      if (isOwnMessage) {
        console.log('[HubChatService] Skipping own message from socket (handled via API response)');
        // Don't add to messages array, but continue to update room list below
      } else {
        const existingIds = this._messages().map(m => m._id);
        if (!existingIds.includes(message._id)) {
          console.log('[HubChatService] Adding message to messages array');
          this._messages.update((msgs) => [...msgs, message]);
        } else {
          console.log('[HubChatService] Message already exists, skipping duplicate');
        }
      }
    }

    // Update room's last message and unread count
    this._rooms.update((rooms) =>
      rooms.map((r) => {
        if (r.room._id === message.roomId) {
          const isSelected = message.roomId === this._selectedRoomId();
          return {
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

  handleMessageDeleted(roomId: string, messageId: string): void {
    if (roomId === this._selectedRoomId()) {
      this._messages.update((msgs) =>
        msgs.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, text: undefined } : m
        )
      );
    }
  }

  handleTypingStart(roomId: string, userId: string, userName: string): void {
    this._typingUsers.update((map) => {
      const newMap = new Map(map);
      newMap.set(roomId, { userId, userName });
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

  handleTotalUnreadUpdate(total: number): void {
    this._totalUnread.set(total);
  }

  // ============================================================================
  // Cache Methods
  // ============================================================================

  clearCache(): void {
    this._rooms.set([]);
    this._roomsPagination.set(DEFAULT_PAGINATION);
    this._selectedRoomId.set(null);
    this._messages.set([]);
    this._messagesCursor.set(null);
    this._hasMoreMessages.set(false);
    this._filters.set(DEFAULT_FILTER_STATE);
    this._totalUnread.set(0);
    this._typingUsers.set(new Map());
    this._initialized.set(false);
    this._cachedHubId.set(null);
    this._error.set(null);
  }

  // ============================================================================
  // Private Methods
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
}
