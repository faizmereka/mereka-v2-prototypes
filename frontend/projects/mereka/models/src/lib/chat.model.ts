// Chat Models - Aligned with backend specs
// @spec: specs/messaging/messaging-fe-components_spec.md

// ============================================
// ENUMS
// ============================================

export type ChatContextType =
  | 'HUB'
  | 'EXPERTISE'
  | 'EXPERIENCE'
  | 'BOOKING'
  | 'JOB'
  | 'PROPOSAL'
  | 'CONTRACT'
  | 'GENERAL';

export type ChatRoomStatus = 'ACTIVE' | 'CLOSED';

export type ChatParticipantStatus = 'JOINED' | 'LEFT' | 'INVITED';

export type ChatParticipantType = 'LEARNER' | 'HUB_TEAM';

export type ChatMessageType = 'TEXT' | 'FILE' | 'EVENT';

export type ChatEventType =
  | 'BOOKING_REQUESTED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED'
  | 'PROPOSAL_SUBMITTED'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'CONTRACT_STARTED'
  | 'CONTRACT_COMPLETED'
  | 'MILESTONE_CREATED'
  | 'MILESTONE_SUBMITTED'
  | 'MILESTONE_APPROVED'
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT'
  | 'PARTICIPANT_ASSIGNED';

export type ChatFilter = 'all' | 'unread' | 'assigned' | 'unassigned';

// ============================================
// INTERFACES
// ============================================

export interface ChatHubSnapshot {
  name: string;
  logo?: string;
}

export interface ChatLearnerSnapshot {
  name: string;
  email: string;
  avatar?: string;
}

export interface ChatContextSnapshot {
  title: string;
  image?: string;
  status?: string;
}

export interface ChatParticipant {
  userId: string;
  hubId?: string;
  name: string;
  email?: string;
  avatar?: string;
  type: ChatParticipantType;
  status: ChatParticipantStatus;
  isAssigned?: boolean;
  assignedAt?: string;
  joinedAt?: string;
}

export interface ChatLastMessage {
  _id: string;
  preview: string;
  sentAt: string;
  senderName: string;
}

export interface ChatRoom {
  _id: string;
  hubId: string;
  hubSnapshot: ChatHubSnapshot;
  learnerId?: string;
  learnerSnapshot?: ChatLearnerSnapshot;
  otherHubId?: string;
  otherHubSnapshot?: ChatHubSnapshot;
  contextType: ChatContextType;
  contextId?: string;
  contextSnapshot?: ChatContextSnapshot;
  participants: ChatParticipant[];
  participantIds: string[];
  status: ChatRoomStatus;
  messageCount: number;
  lastMessage?: ChatLastMessage;
  createdAt: string;
  updatedAt: string;
}

export interface ChatUserState {
  roomId: string;
  userId: string;
  hubId?: string;
  unreadCount: number;
  lastReadAt?: string;
  lastReadMessageId?: string;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  hasViewed: boolean;
}

export interface ChatMessageSender {
  userId: string;
  hubId?: string;
  name: string;
  avatar?: string;
  type: ChatParticipantType;
}

export interface ChatFile {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl?: string;
}

export interface ChatEvent {
  eventType: ChatEventType;
  entityType: string;
  entityId: string;
  summary: string;
  data: Record<string, unknown>;
}

export interface ChatMessage {
  _id: string;
  roomId: string;
  sender: ChatMessageSender;
  type: ChatMessageType;
  text?: string;
  files?: ChatFile[];
  event?: ChatEvent;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  isDeleted: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ChatRoomListItem {
  room: ChatRoom;
  userState: ChatUserState;
  assignedMember?: {
    memberId: string;
    name: string;
    avatar?: string;
  };
  // Computed by backend for convenience
  isMember: boolean;
  isMuted: boolean;
  isArchived: boolean;
}

export interface ChatRoomListResponse {
  rooms: ChatRoomListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  cursor?: string;
}

export interface SendMessageRequest {
  text: string;
  files?: File[];
}

export interface SendMessageResponse {
  success: boolean;
  data: ChatMessage;
}

// ============================================
// SOCKET EVENT TYPES
// ============================================

export interface TypingUser {
  userId: string;
  name: string;
}

export interface NewMessageEvent {
  _id: string;
  roomId: string;
  sender: ChatMessageSender;
  type: ChatMessageType;
  text?: string;
  files?: ChatFile[];
  event?: ChatEvent;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDeletedEvent {
  roomId: string;
  messageId: string;
}

export interface UserTypingEvent {
  roomId: string;
  userId: string;
  userName: string;
}

export interface UnreadUpdateEvent {
  roomId: string;
  count: number;
}

export interface TotalUnreadUpdateEvent {
  total: number;
}

export interface RoomUpdatedEvent {
  roomId: string;
  type: string;
  data: unknown;
}
