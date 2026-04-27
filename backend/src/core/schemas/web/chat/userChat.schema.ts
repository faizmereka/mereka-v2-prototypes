// src/core/schemas/web/chat/userChat.schema.ts
// @spec: specs/messaging/messaging-learner-inbox_spec.md
// JSON Schema definitions for learner chat endpoints

// ============================================
// INPUT TYPES
// ============================================

export interface UserListChatRoomsQuery {
  cursor?: string;
  limit?: number;
}

export interface ChatFileInput {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl?: string;
}

export interface UserSendMessageBody {
  text?: string;
  files?: ChatFileInput[];
}

export interface UserUpdateSettingsBody {
  isArchived?: boolean;
  isMuted?: boolean;
}

export interface UserInitiateChatBody {
  hubId: string;
  contextType: 'HUB' | 'EXPERIENCE' | 'EXPERTISE' | 'JOB';
  contextId?: string;
}

// ============================================
// SCHEMAS
// ============================================

/**
 * List user chat rooms
 * GET /api/v1/user/chat-rooms
 * @covers AC-LI-001 through AC-LI-008
 */
export const userListChatRoomsSchema = {
  tags: ['User Chat'],
  summary: 'List chat rooms for learner',
  description: 'List all chat rooms where the learner is a participant',
  querystring: {
    type: 'object',
    properties: {
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
                      contextType: { type: 'string' },
                      contextSnapshot: { type: 'object', additionalProperties: true },
                      hubSnapshot: { type: 'object', additionalProperties: true },
                      lastMessage: { type: 'object', additionalProperties: true },
                      participants: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: true,
                          properties: {
                            userId: { type: 'string' },
                            name: { type: 'string' },
                            avatar: { type: 'string' },
                            type: { type: 'string' },
                            status: { type: 'string' },
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
                  isMember: { type: 'boolean' },
                  isMuted: { type: 'boolean' },
                  isArchived: { type: 'boolean' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                cursor: { type: 'string' },
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
 * Get user unread count
 * GET /api/v1/user/chat-rooms/unread-count
 * @covers AC-LI-040
 */
export const userGetUnreadCountSchema = {
  tags: ['User Chat'],
  summary: 'Get total unread count',
  description: 'Get total unread message count across all rooms',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            unreadCount: { type: 'number' },
          },
        },
      },
    },
  },
} as const;

/**
 * Get chat room detail (for learner)
 * GET /api/v1/chat-rooms/:roomId
 * @covers AC-LI-010 through AC-LI-013
 */
export const userGetChatRoomSchema = {
  tags: ['User Chat'],
  summary: 'Get chat room detail',
  description: 'Get detailed information about a chat room (privacy-transformed for learner)',
  params: {
    type: 'object',
    required: ['roomId'],
    properties: {
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
 * Get chat messages (for learner)
 * GET /api/v1/chat-rooms/:roomId/messages
 * @covers AC-LI-020 through AC-LI-023
 */
export const userGetChatMessagesSchema = {
  tags: ['User Chat'],
  summary: 'Get chat messages',
  description: 'Get messages for a chat room (privacy-transformed for learner)',
  params: {
    type: 'object',
    required: ['roomId'],
    properties: {
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
 * Send chat message (for learner)
 * POST /api/v1/chat-rooms/:roomId/messages
 * @covers AC-LI-030
 */
export const userSendChatMessageSchema = {
  tags: ['User Chat'],
  summary: 'Send chat message',
  description: 'Send a text message with optional file attachments in a chat room',
  params: {
    type: 'object',
    required: ['roomId'],
    properties: {
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
 * Mark chat as read (for learner)
 * POST /api/v1/chat-rooms/:roomId/read
 * @covers AC-LI-031
 */
export const userMarkChatReadSchema = {
  tags: ['User Chat'],
  summary: 'Mark chat as read',
  description: 'Mark all messages in a chat room as read',
  params: {
    type: 'object',
    required: ['roomId'],
    properties: {
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
 * Update chat settings (for learner)
 * PATCH /api/v1/chat-rooms/:roomId/settings
 * @covers AC-LI-032
 */
export const userUpdateChatSettingsSchema = {
  tags: ['User Chat'],
  summary: 'Update chat settings',
  description: 'Update archive/mute settings for a chat room',
  params: {
    type: 'object',
    required: ['roomId'],
    properties: {
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
    properties: {
      isArchived: {
        type: 'boolean',
        description: 'Archive this chat',
      },
      isMuted: {
        type: 'boolean',
        description: 'Mute notifications for this chat',
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

// Room ID params schema (reusable)
const roomIdParams = {
  type: 'object',
  required: ['roomId'],
  properties: {
    roomId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Chat Room ID',
    },
  },
} as const;

const successResponse = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
    },
  },
} as const;

/**
 * Archive chat room (for learner)
 * POST /api/v1/learner/chat/rooms/:roomId/archive
 */
export const userArchiveChatRoomSchema = {
  tags: ['User Chat'],
  summary: 'Archive chat room',
  description: 'Archive a chat room for the learner',
  params: roomIdParams,
  response: successResponse,
} as const;

/**
 * Unarchive chat room (for learner)
 * POST /api/v1/learner/chat/rooms/:roomId/unarchive
 */
export const userUnarchiveChatRoomSchema = {
  tags: ['User Chat'],
  summary: 'Unarchive chat room',
  description: 'Unarchive a chat room for the learner',
  params: roomIdParams,
  response: successResponse,
} as const;

/**
 * Mute chat room (for learner)
 * POST /api/v1/learner/chat/rooms/:roomId/mute
 */
export const userMuteChatRoomSchema = {
  tags: ['User Chat'],
  summary: 'Mute chat room',
  description: 'Mute notifications for a chat room',
  params: roomIdParams,
  response: successResponse,
} as const;

/**
 * Unmute chat room (for learner)
 * POST /api/v1/learner/chat/rooms/:roomId/unmute
 */
export const userUnmuteChatRoomSchema = {
  tags: ['User Chat'],
  summary: 'Unmute chat room',
  description: 'Unmute notifications for a chat room',
  params: roomIdParams,
  response: successResponse,
} as const;

/**
 * Initiate chat with a hub
 * POST /api/v1/learner/chat/rooms/initiate
 * Creates or retrieves an existing chat room between learner and hub
 */
export const userInitiateChatSchema = {
  tags: ['User Chat'],
  summary: 'Initiate chat with hub',
  description:
    'Create or retrieve an existing chat room with a hub. Used from Hub Detail and Experience Detail pages.',
  body: {
    type: 'object',
    required: ['hubId', 'contextType'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID to chat with',
      },
      contextType: {
        type: 'string',
        enum: ['HUB', 'EXPERIENCE', 'EXPERTISE', 'JOB'],
        description:
          'Context type - HUB for general inquiry, EXPERIENCE/EXPERTISE/JOB for specific context',
      },
      contextId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Context ID (required for EXPERIENCE context type)',
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
          additionalProperties: true,
          properties: {
            _id: { type: 'string' },
            hubId: { type: 'string' },
            contextType: { type: 'string' },
            contextSnapshot: { type: 'object', additionalProperties: true },
            hubSnapshot: { type: 'object', additionalProperties: true },
            status: { type: 'string' },
          },
        },
      },
    },
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          additionalProperties: true,
          properties: {
            _id: { type: 'string' },
            hubId: { type: 'string' },
            contextType: { type: 'string' },
            contextSnapshot: { type: 'object', additionalProperties: true },
            hubSnapshot: { type: 'object', additionalProperties: true },
            status: { type: 'string' },
          },
        },
      },
    },
  },
} as const;
