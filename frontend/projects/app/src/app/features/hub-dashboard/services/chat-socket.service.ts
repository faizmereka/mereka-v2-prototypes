import { Injectable, inject, signal, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { HubChatService } from './hub-chat.service';
import { LearnerChatService } from '../../user-dashboard/services/learner-chat.service';
import type {
  NewMessageEvent,
  MessageDeletedEvent,
  UserTypingEvent,
  UnreadUpdateEvent,
  TotalUnreadUpdateEvent,
  ChatMessage,
} from '@mereka/models';

// ============================================================================
// Socket Event Names (must match backend)
// ============================================================================

const SOCKET_EVENTS = {
  // Client -> Server (must match backend handler events)
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',

  // Server -> Client (must match backend emit events)
  NEW_MESSAGE: 'new_message',
  MESSAGE_DELETED: 'message_deleted',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  UNREAD_UPDATE: 'unread_update',
  TOTAL_UNREAD_UPDATE: 'total_unread_update',
  ROOM_UPDATED: 'room_updated',
} as const;

// ============================================================================
// Chat Socket Service
// ============================================================================

/**
 * Chat Socket Service - Handles WebSocket connections for real-time chat
 *
 * Features:
 * - Firebase Auth token-based authentication
 * - Auto-reconnection
 * - Room joining/leaving
 * - Typing indicators
 * - Real-time message updates
 *
 * @covers AC-FEH-060 through AC-FEH-064, AC-FEH-073
 */
@Injectable({ providedIn: 'root' })
export class ChatSocketService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authState = inject(AuthStateService);
  private readonly hubChatService = inject(HubChatService);
  private readonly learnerChatService = inject(LearnerChatService);

  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private typingTimeout?: ReturnType<typeof setTimeout>;
  private connectionMode: 'hub' | 'learner' | null = null;

  // Connection state
  private readonly _connected = signal(false);
  private readonly _reconnecting = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly connected = this._connected.asReadonly();
  readonly reconnecting = this._reconnecting.asReadonly();
  readonly socketError = this._error.asReadonly();

  ngOnDestroy(): void {
    this.disconnect();
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to the chat WebSocket server
   * Uses cookie-based authentication (withCredentials)
   * Supports both hub and learner contexts
   * @covers AC-FEH-060
   */
  async connect(): Promise<void> {
    // Only run in browser
    if (!isPlatformBrowser(this.platformId)) return;

    // Check if user is authenticated
    const userId = this.authState.user()?.id;
    if (!userId) {
      this._error.set('Authentication required');
      return;
    }

    // Determine connection mode - hub if hubId exists, otherwise learner
    const hubId = this.authState.selectedHub()?.id;
    const newMode = hubId ? 'hub' : 'learner';

    // If already connected with same mode, return
    if (this.socket?.connected && this.connectionMode === newMode) {
      return;
    }

    // Disconnect existing socket if mode changed
    if (this.socket && this.connectionMode !== newMode) {
      console.log(`[ChatSocket] Mode changed from ${this.connectionMode} to ${newMode}, reconnecting...`);
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionMode = newMode;

    // Initialize socket connection with cookie-based auth
    console.log(`[ChatSocket] Connecting in ${this.connectionMode} mode...`);
    this.socket = io(environment.apiBaseUrl, {
      path: '/socket.io',
      auth: {
        userId,
        hubId: hubId || undefined, // Optional for learner mode
        mode: this.connectionMode,
      },
      withCredentials: true, // Send cookies for auth
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from the chat server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoomId = null;
    this._connected.set(false);
    this._reconnecting.set(false);
    this._error.set(null);
    clearTimeout(this.typingTimeout);
  }

  // ============================================================================
  // Room Management
  // ============================================================================

  /**
   * Join a chat room to receive messages
   * @covers AC-FEH-060
   */
  joinRoom(roomId: string): void {
    if (!this.socket?.connected) {
      console.warn('[ChatSocket] Socket not connected, cannot join room');
      return;
    }

    // Leave previous room if any
    if (this.currentRoomId && this.currentRoomId !== roomId) {
      this.leaveRoom(this.currentRoomId);
    }

    console.log(`[ChatSocket] Joining room: ${roomId}`);
    this.socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId });
    this.currentRoomId = roomId;
  }

  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId });

    if (this.currentRoomId === roomId) {
      this.currentRoomId = null;
    }
  }

  // ============================================================================
  // Typing Indicators
  // ============================================================================

  /**
   * Send typing start indicator
   * @covers AC-FEH-073
   */
  sendTypingStart(roomId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit(SOCKET_EVENTS.TYPING_START, { roomId });

    // Auto-stop typing after 3 seconds of inactivity
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.sendTypingStop(roomId);
    }, 3000);
  }

  /**
   * Send typing stop indicator
   */
  sendTypingStop(roomId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit(SOCKET_EVENTS.TYPING_STOP, { roomId });
    clearTimeout(this.typingTimeout);
  }

  // ============================================================================
  // Private: Event Listeners
  // ============================================================================

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log(`[ChatSocket] Connected! Mode: ${this.connectionMode}, Socket ID: ${this.socket?.id}`);
      this._connected.set(true);
      this._reconnecting.set(false);
      this._error.set(null);

      // Rejoin current room if any
      if (this.currentRoomId) {
        console.log(`[ChatSocket] Rejoining room: ${this.currentRoomId}`);
        this.joinRoom(this.currentRoomId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Chat socket disconnected:', reason);
      this._connected.set(false);

      if (reason === 'io server disconnect') {
        // Server disconnected us, need to reconnect manually
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Chat socket connection error:', error);
      this._error.set('Connection failed');
      this._connected.set(false);
    });

    // Reconnection events
    this.socket.io.on('reconnect_attempt', () => {
      this._reconnecting.set(true);
    });

    this.socket.io.on('reconnect', () => {
      console.log('Chat socket reconnected');
      this._reconnecting.set(false);
      this._connected.set(true);

      // Refresh messages on reconnect
      // @covers AC-FEH-092
      if (this.currentRoomId) {
        this.getChatService().loadMessages(this.currentRoomId);
      }
    });

    this.socket.io.on('reconnect_failed', () => {
      this._reconnecting.set(false);
      this._error.set('Reconnection failed');
    });

    // Chat events
    // @covers AC-FEH-060
    this.socket.on(SOCKET_EVENTS.NEW_MESSAGE, (data: NewMessageEvent) => {
      console.log(`[ChatSocket] NEW_MESSAGE received:`, data);
      const message: ChatMessage = {
        _id: data._id,
        roomId: data.roomId,
        sender: data.sender,
        type: data.type,
        text: data.text,
        files: data.files,
        event: data.event,
        createdAt: data.createdAt,
        isDeleted: false,
      };
      console.log(`[ChatSocket] Calling handleNewMessage for mode: ${this.connectionMode}`);
      this.getChatService().handleNewMessage(message);
    });

    this.socket.on(SOCKET_EVENTS.MESSAGE_DELETED, (data: MessageDeletedEvent) => {
      this.getChatService().handleMessageDeleted(data.roomId, data.messageId);
    });

    // @covers AC-FEH-062
    this.socket.on(SOCKET_EVENTS.USER_TYPING, (data: UserTypingEvent) => {
      if (this.connectionMode === 'hub') {
        this.hubChatService.handleTypingStart(data.roomId, data.userId, data.userName);
      } else {
        this.learnerChatService.handleTypingStart(data.roomId, data.userName);
      }
    });

    this.socket.on(SOCKET_EVENTS.USER_STOPPED_TYPING, (data: { roomId: string }) => {
      if (this.connectionMode === 'hub') {
        this.hubChatService.handleTypingStop(data.roomId);
      } else {
        this.learnerChatService.handleTypingStop(data.roomId);
      }
    });

    // @covers AC-FEH-061, AC-FEH-064
    this.socket.on(SOCKET_EVENTS.UNREAD_UPDATE, (data: UnreadUpdateEvent) => {
      this.getChatService().handleUnreadUpdate(data.roomId, data.count);
    });

    this.socket.on(SOCKET_EVENTS.TOTAL_UNREAD_UPDATE, (data: TotalUnreadUpdateEvent) => {
      if (this.connectionMode === 'hub') {
        this.hubChatService.handleTotalUnreadUpdate(data.total);
      }
      // Learner service doesn't have this method - recalculate locally
    });

    // Room updates (e.g., new participant joined)
    this.socket.on(SOCKET_EVENTS.ROOM_UPDATED, (_data: { roomId: string; type: string }) => {
      // Refresh room list to get updated data
      this.getChatService().refreshRooms();
    });
  }

  /**
   * Get the appropriate chat service based on connection mode
   */
  private getChatService(): HubChatService | LearnerChatService {
    return this.connectionMode === 'hub' ? this.hubChatService : this.learnerChatService;
  }
}
