// src/core/schemas/hub/chat/hubChat.schema.ts
// @spec: specs/messaging/messaging-hub-inbox_spec.md
// JSON Schema definitions for hub chat endpoints

import type { ChatContextType } from '@core/models/ChatRoom';

// ============================================
// INPUT TYPES
// ============================================

export interface HubListChatRoomsQuery {
  filter?: 'ALL' | 'ASSIGNED_TO_ME' | 'UNASSIGNED' | 'ARCHIVED';
  context?: ChatContextType;
  cursor?: string;
  limit?: number;
}

export interface HubAssignMemberBody {
  userId: string;
}

export interface HubSearchRoomsQuery {
  q: string;
  limit?: number;
}

export interface HubChatFileInput {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl?: string;
}

export interface HubSendMessageBody {
  text?: string;
  files?: HubChatFileInput[];
}

// ============================================
// SCHEMAS
// ============================================

/**
 * List hub chat rooms (inbox)
 * GET /api/v1/hub/:hubId/chat-rooms
 * @covers AC-HI-001 through AC-HI-024
 */
export const hubListChatRoomsSchema = {
  tags: ['Hub Chat'],
  summary: 'List hub chat rooms (inbox)',
  description: 'List all chat rooms for a hub with filters and sidebar counts',
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['ALL', 'ASSIGNED_TO_ME', 'UNASSIGNED', 'ARCHIVED'],
        default: 'ALL',
        description: 'Filter category',
      },
      context: {
        type: 'string',
        enum: ['EXPERTISE', 'BOOKING', 'JOB', 'CONTRACT', 'GENERAL'],
        description: 'Filter by context type',
      },
      cursor: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Cursor for pagination (room ID)',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        default: 20,
        description: 'Number of rooms per page',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            rooms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  room: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                      _id: { type: 'string' },
                      hubId: { type: 'string' },
                      contextType: { type: 'string' },
                      contextSnapshot: { type: 'object', additionalProperties: true },
                      learnerSnapshot: { type: 'object', additionalProperties: true },
                      otherHubSnapshot: { type: 'object', additionalProperties: true },
                      lastMessage: { type: 'object', additionalProperties: true },
                      participants: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: true,
                          properties: {
                            userId: { type: 'string' },
                            hubId: { type: 'string' },
                            name: { type: 'string' },
                            email: { type: 'string' },
                            avatar: { type: 'string' },
                            type: { type: 'string' },
                            status: { type: 'string' },
                            isAssigned: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                  userState: {
                    type: 'object',
                    properties: {
                      roomId: { type: 'string' },
                      userId: { type: 'string' },
                      unreadCount: { type: 'number' },
                      isArchived: { type: 'boolean' },
                      isMuted: { type: 'boolean' },
                      isPinned: { type: 'boolean' },
                      hasViewed: { type: 'boolean' },
                    },
                  },
                  assignedMember: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      memberId: { type: 'string' },
                      name: { type: 'string' },
                      avatar: { type: 'string' },
                    },
                  },
                  isMember: { type: 'boolean' },
                  isMuted: { type: 'boolean' },
                  isArchived: { type: 'boolean' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                hasMore: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Get chat room detail
 * GET /api/v1/hub/:hubId/chat-rooms/:roomId
 * @covers AC-HI-040 through AC-HI-044
 */
export const hubGetChatRoomSchema = {
  tags: ['Hub Chat'],
  summary: 'Get chat room detail',
  description: 'Get detailed information about a chat room',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
      },
    },
  },
} as const;

/**
 * Join chat room
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/join
 * @covers AC-HI-030, AC-HI-052
 */
export const hubJoinChatRoomSchema = {
  tags: ['Hub Chat'],
  summary: 'Join chat room',
  description: 'Join a chat conversation as a hub team member',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
      },
    },
  },
} as const;

/**
 * Assign member to chat room
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/assign
 * @covers AC-HI-031, AC-HI-051
 */
export const hubAssignChatRoomSchema = {
  tags: ['Hub Chat'],
  summary: 'Assign member to chat room',
  description: 'Assign a hub team member to handle a conversation',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'User ID to assign',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
      },
    },
  },
} as const;

/**
 * Unassign member from chat room
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/unassign
 * @covers AC-HI-032
 */
export const hubUnassignChatRoomSchema = {
  tags: ['Hub Chat'],
  summary: 'Unassign member from chat room',
  description: 'Remove assignment from a hub team member',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'User ID to unassign',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  },
} as const;

/**
 * Archive chat room for user
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/archive
 * @covers AC-HI-033, AC-HI-053
 */
export const hubArchiveChatRoomSchema = {
  tags: ['Hub Chat'],
  summary: 'Archive chat room',
  description: 'Archive a chat room for the current user',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  },
} as const;

/**
 * Unarchive chat room for user
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/unarchive
 * @covers AC-HI-034, AC-HI-053
 */
export const hubUnarchiveChatRoomSchema = {
  tags: ['Hub Chat'],
  summary: 'Unarchive chat room',
  description: 'Unarchive a chat room for the current user',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  },
} as const;

/**
 * Mute chat room for user
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/mute
 * @covers AC-HI-035, AC-HI-053
 */
export const hubMuteChatRoomSchema = {
  tags: ['Hub Chat'],
  summary: 'Mute chat room',
  description: 'Mute notifications for a chat room',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  },
} as const;

/**
 * Unmute chat room for user
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/unmute
 * @covers AC-HI-036, AC-HI-053
 */
export const hubUnmuteChatRoomSchema = {
  tags: ['Hub Chat'],
  summary: 'Unmute chat room',
  description: 'Unmute notifications for a chat room',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  },
} as const;

/**
 * Search chat rooms
 * GET /api/v1/hub/:hubId/chat-rooms/search
 * @covers AC-HI-060 through AC-HI-064
 */
export const hubSearchChatRoomsSchema = {
  tags: ['Hub Chat'],
  summary: 'Search chat rooms',
  description: 'Search rooms by participant names, context title, or message content',
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
    },
  },
  querystring: {
    type: 'object',
    required: ['q'],
    properties: {
      q: {
        type: 'string',
        minLength: 1,
        description: 'Search query',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        default: 20,
        description: 'Maximum results',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            rooms: { type: 'array' },
          },
        },
      },
    },
  },
} as const;

/**
 * Get chat messages
 * GET /api/v1/hub/:hubId/chat-rooms/:roomId/messages
 */
export const hubGetChatMessagesSchema = {
  tags: ['Hub Chat'],
  summary: 'Get chat messages',
  description: 'Get messages for a chat room with pagination',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      cursor: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Cursor for pagination (message ID)',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Number of messages per page',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            messages: { type: 'array' },
            hasMore: { type: 'boolean' },
            cursor: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

/**
 * Send chat message
 * POST /api/v1/hub/:hubId/chat-rooms/:roomId/messages
 */
export const hubSendChatMessageSchema = {
  tags: ['Hub Chat'],
  summary: 'Send chat message',
  description: 'Send a text message with optional file attachments in a chat room',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  body: {
    type: 'object',
    anyOf: [{ required: ['text'] }, { required: ['files'] }],
    properties: {
      text: {
        type: 'string',
        maxLength: 10000,
        description: 'Message text (optional if files provided)',
      },
      files: {
        type: 'array',
        maxItems: 10,
        description: 'File attachments (URLs from Firebase Storage)',
        items: {
          type: 'object',
          required: ['name', 'url', 'mimeType', 'sizeBytes'],
          properties: {
            name: { type: 'string', maxLength: 255, description: 'Original filename' },
            url: { type: 'string', format: 'uri', description: 'Firebase Storage download URL' },
            mimeType: {
              type: 'string',
              maxLength: 100,
              description: 'MIME type (e.g., image/jpeg, application/pdf)',
            },
            sizeBytes: {
              type: 'number',
              minimum: 1,
              maximum: 52428800,
              description: 'File size in bytes (max 50MB)',
            },
            thumbnailUrl: {
              type: 'string',
              format: 'uri',
              description: 'Optional thumbnail URL for images',
            },
          },
        },
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          additionalProperties: true,
          properties: {
            _id: { type: 'string' },
            roomId: { type: 'string' },
            sender: { type: 'object', additionalProperties: true },
            type: { type: 'string' },
            text: { type: 'string' },
            files: { type: 'array', items: { type: 'object', additionalProperties: true } },
            createdAt: { type: 'string' },
            isDeleted: { type: 'boolean' },
          },
        },
      },
    },
  },
} as const;

/**
 * Mark chat as read
 * POST /api/v1/hub/:hubId/chat/rooms/:roomId/read
 */
export const hubMarkChatReadSchema = {
  tags: ['Hub Chat'],
  summary: 'Mark chat as read',
  description: 'Mark all messages in a chat room as read',
  params: {
    type: 'object',
    required: ['hubId', 'roomId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      roomId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Chat Room ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  },
} as const;

/**
 * Get total unread count
 * GET /api/v1/hub/:hubId/chat/unread/total
 * @covers AC-FEH-011
 */
export const hubGetUnreadTotalSchema = {
  tags: ['Hub Chat'],
  summary: 'Get total unread count',
  description: 'Get total unread message count across all chat rooms for the hub',
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
          },
        },
      },
    },
  },
} as const;

/**
 * Get filter counts for sidebar
 * GET /api/v1/hub/:hubId/chat/counts
 * @covers AC-FEH-011, AC-FEH-014
 */
export const hubGetFilterCountsSchema = {
  tags: ['Hub Chat'],
  summary: 'Get filter counts',
  description: 'Get counts for all, unread, assigned, unassigned filters and context types',
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            all: { type: 'number' },
            unread: { type: 'number' },
            assigned: { type: 'number' },
            unassigned: { type: 'number' },
            contexts: {
              type: 'object',
              properties: {
                EXPERTISE: { type: 'number' },
                EXPERIENCE: { type: 'number' },
                BOOKING: { type: 'number' },
                JOB: { type: 'number' },
                CONTRACT: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
} as const;
