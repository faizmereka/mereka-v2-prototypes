import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Context type for chat initiation
 */
export type ChatContextType = 'HUB' | 'EXPERIENCE' | 'EXPERTISE' | 'JOB';

/**
 * Parameters for initiating a chat
 */
export interface InitiateChatParams {
  hubId: string;
  contextType: ChatContextType;
  contextId?: string;
}

/**
 * Chat room returned from initiate API
 */
export interface ChatRoomData {
  _id: string;
  hubId: string;
  contextType: string;
  contextSnapshot?: {
    title: string;
    image?: string;
    status?: string;
  };
  hubSnapshot?: {
    name: string;
    logo?: string;
  };
  status: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Pending chat action stored in localStorage
 */
interface PendingChatAction {
  action: 'chat';
  hubId: string;
  contextType: ChatContextType;
  contextId?: string;
  returnUrl: string;
}

const PENDING_CHAT_ACTION_KEY = 'pendingChatAction';

/**
 * ChatInitiationService - Handles initiating chats from Hub Detail and Experience Detail pages
 *
 * Features:
 * - Initiates chat room via backend API
 * - Handles unauthenticated users by saving action and redirecting to login
 * - Navigates to chat page with room pre-selected
 */
@Injectable({ providedIn: 'root' })
export class ChatInitiationService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);

  private readonly apiUrl = `${environment.apiUrl}/learner/chat`;

  /**
   * Initiate a chat with a hub
   * If user is not authenticated, stores the action and redirects to login
   *
   * @param params - Chat initiation parameters
   */
  async initiateChat(params: InitiateChatParams): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Check if user is authenticated
    if (!this.authService.isLoggedIn()) {
      // Store pending action and redirect to login
      this.storePendingAction(params);
      this.redirectToLogin();
      return;
    }

    try {
      // Call API to initiate/get chat room
      const room = await this.callInitiateApi(params);

      if (room) {
        // Navigate to chat page with room selected
        this.navigateToChat(room._id);
      }
    } catch (error) {
      console.error('Failed to initiate chat:', error);
      throw error;
    }
  }

  /**
   * Check for and process any pending chat action after login
   * Should be called on app initialization or after successful login
   */
  async processPendingChatAction(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const pendingAction = this.getPendingAction();
    if (!pendingAction) {
      return false;
    }

    // Clear the pending action
    this.clearPendingAction();

    // Check if user is now authenticated
    if (!this.authService.isLoggedIn()) {
      return false;
    }

    try {
      // Process the pending action
      const room = await this.callInitiateApi({
        hubId: pendingAction.hubId,
        contextType: pendingAction.contextType,
        contextId: pendingAction.contextId,
      });

      if (room) {
        this.navigateToChat(room._id);
        return true;
      }
    } catch (error) {
      console.error('Failed to process pending chat action:', error);
    }

    return false;
  }

  /**
   * Call the initiate chat API
   */
  private async callInitiateApi(params: InitiateChatParams): Promise<ChatRoomData | null> {
    const url = `${this.apiUrl}/rooms/initiate`;

    const body: Record<string, string> = {
      hubId: params.hubId,
      contextType: params.contextType,
    };

    if (params.contextId) {
      body['contextId'] = params.contextId;
    }

    const response = await firstValueFrom(
      this.http.post<ApiResponse<ChatRoomData>>(url, body, {
        withCredentials: true,
      })
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to initiate chat');
    }

    return response.data;
  }

  /**
   * Navigate to the chat page with room pre-selected
   */
  private navigateToChat(roomId: string): void {
    const chatUrl = `${environment.appUrls.app}/dashboard/chats?room=${roomId}`;
    window.location.href = chatUrl;
  }

  /**
   * Redirect to login page with return URL
   */
  private redirectToLogin(): void {
    const returnUrl = encodeURIComponent(window.location.href);
    const loginUrl = `${environment.appUrls.auth}/login?returnUrl=${returnUrl}`;
    window.location.href = loginUrl;
  }

  /**
   * Store pending chat action in localStorage
   */
  private storePendingAction(params: InitiateChatParams): void {
    const action: PendingChatAction = {
      action: 'chat',
      hubId: params.hubId,
      contextType: params.contextType,
      contextId: params.contextId,
      returnUrl: window.location.href,
    };

    try {
      localStorage.setItem(PENDING_CHAT_ACTION_KEY, JSON.stringify(action));
    } catch {
      // localStorage might be disabled
      console.warn('Failed to store pending chat action');
    }
  }

  /**
   * Get pending chat action from localStorage
   */
  private getPendingAction(): PendingChatAction | null {
    try {
      const stored = localStorage.getItem(PENDING_CHAT_ACTION_KEY);
      if (!stored) return null;

      const action = JSON.parse(stored) as PendingChatAction;
      if (action.action !== 'chat') return null;

      return action;
    } catch {
      return null;
    }
  }

  /**
   * Clear pending chat action from localStorage
   */
  private clearPendingAction(): void {
    try {
      localStorage.removeItem(PENDING_CHAT_ACTION_KEY);
    } catch {
      // Ignore
    }
  }
}
