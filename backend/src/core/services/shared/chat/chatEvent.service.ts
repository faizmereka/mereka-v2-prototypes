// src/core/services/shared/chat/chatEvent.service.ts
// @spec: specs/messaging/messaging-events_spec.md
// @covers AC-EV-001 through AC-EV-063

import type { IChatMessage } from '@core/models/ChatMessage';
import {
  ChatEventEntityType,
  type ChatEventType,
  ChatMessage,
  ChatMessageType,
} from '@core/models/ChatMessage';
import { ChatContextType, ChatRoom } from '@core/models/ChatRoom';
import { ChatUserState } from '@core/models/ChatUserState';
import mongoose from 'mongoose';

// ============================================
// TYPES
// ============================================

interface CreateEventParams {
  roomId: mongoose.Types.ObjectId | string;
  eventType: ChatEventType;
  entityType: ChatEventEntityType;
  entityId: mongoose.Types.ObjectId | string;
  summary: string;
  data?: Record<string, unknown>;
  triggeredBy?: mongoose.Types.ObjectId | string;
}

interface CreateBookingEventParams {
  bookingId: mongoose.Types.ObjectId | string;
  hubId: mongoose.Types.ObjectId | string;
  learnerId: mongoose.Types.ObjectId | string;
  expertiseId?: mongoose.Types.ObjectId | string;
  eventType: ChatEventType;
  summary: string;
  data?: Record<string, unknown>;
}

interface CreateProposalEventParams {
  proposalId: mongoose.Types.ObjectId | string;
  jobId: mongoose.Types.ObjectId | string;
  clientHubId: mongoose.Types.ObjectId | string;
  expertHubId: mongoose.Types.ObjectId | string;
  eventType: ChatEventType;
  summary: string;
  data?: Record<string, unknown>;
}

interface CreateContractEventParams {
  contractId: mongoose.Types.ObjectId | string;
  eventType: ChatEventType;
  summary: string;
  data?: Record<string, unknown>;
}

// ============================================
// SERVICE CLASS
// ============================================

class ChatEventService {
  /**
   * Create an event message in a chat room
   * @covers AC-EV-060, AC-EV-061, AC-EV-062, AC-EV-063
   */
  async createEvent(params: CreateEventParams): Promise<IChatMessage> {
    const { roomId, eventType, entityType, entityId, summary, data, triggeredBy } = params;

    // Create event message
    const message = await ChatMessage.create({
      roomId: new mongoose.Types.ObjectId(roomId.toString()),
      sender: {
        userId: triggeredBy
          ? new mongoose.Types.ObjectId(triggeredBy.toString())
          : new mongoose.Types.ObjectId(),
        name: 'System',
        type: 'HUB_TEAM',
      },
      type: ChatMessageType.EVENT,
      event: {
        eventType,
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId.toString()),
        summary,
        data: data || {},
      },
    });

    // AC-EV-063: Update room's lastMessage cache
    await ChatRoom.findByIdAndUpdate(roomId, {
      lastMessage: {
        _id: message._id,
        preview: summary,
        sentAt: message.createdAt,
        senderName: 'System',
      },
      $inc: { messageCount: 1 },
    });

    // AC-EV-062: Increment unread counts for all participants
    await ChatUserState.updateMany(
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
      },
      {
        $inc: { unreadCount: 1 },
      },
    );

    return message;
  }

  /**
   * Create booking event message
   * @covers AC-EV-001, AC-EV-002, AC-EV-003, AC-EV-004, AC-EV-005, AC-EV-006
   */
  async createBookingEvent(params: CreateBookingEventParams): Promise<IChatMessage | null> {
    const { bookingId, eventType, summary, data } = params;

    // Find the chat room for this booking
    const room = await ChatRoom.findOne({
      contextType: ChatContextType.BOOKING,
      contextId: new mongoose.Types.ObjectId(bookingId.toString()),
    });

    if (!room) {
      // Room doesn't exist yet, skip event creation
      return null;
    }

    return this.createEvent({
      roomId: room._id,
      eventType,
      entityType: ChatEventEntityType.BOOKING,
      entityId: bookingId,
      summary,
      data: {
        bookingId: bookingId.toString(),
        ...data,
      },
    });
  }

  /**
   * Create proposal event message
   * @covers AC-EV-010, AC-EV-011, AC-EV-012, AC-EV-013, AC-EV-014
   */
  async createProposalEvent(params: CreateProposalEventParams): Promise<IChatMessage | null> {
    const { proposalId, jobId, eventType, summary, data } = params;

    // Find the chat room for this proposal
    const room = await ChatRoom.findOne({
      contextType: ChatContextType.PROPOSAL,
      contextId: new mongoose.Types.ObjectId(proposalId.toString()),
    });

    if (!room) {
      return null;
    }

    return this.createEvent({
      roomId: room._id,
      eventType,
      entityType: ChatEventEntityType.PROPOSAL,
      entityId: proposalId,
      summary,
      data: {
        proposalId: proposalId.toString(),
        jobId: jobId.toString(),
        ...data,
      },
    });
  }

  /**
   * Create contract event message
   * @covers AC-EV-020, AC-EV-021, AC-EV-022, AC-EV-023
   */
  async createContractEvent(params: CreateContractEventParams): Promise<IChatMessage | null> {
    const { contractId, eventType, summary, data } = params;

    // Find the chat room for this contract
    const room = await ChatRoom.findOne({
      contextType: ChatContextType.CONTRACT,
      contextId: new mongoose.Types.ObjectId(contractId.toString()),
    });

    if (!room) {
      return null;
    }

    return this.createEvent({
      roomId: room._id,
      eventType,
      entityType: ChatEventEntityType.CONTRACT,
      entityId: contractId,
      summary,
      data: {
        contractId: contractId.toString(),
        ...data,
      },
    });
  }

  /**
   * Create milestone event message
   * @covers AC-EV-030, AC-EV-031, AC-EV-032, AC-EV-033, AC-EV-034
   */
  async createMilestoneEvent(params: {
    milestoneId: mongoose.Types.ObjectId | string;
    contractId: mongoose.Types.ObjectId | string;
    eventType: ChatEventType;
    summary: string;
    data?: Record<string, unknown>;
  }): Promise<IChatMessage | null> {
    const { milestoneId, contractId, eventType, summary, data } = params;

    // Find the chat room for this contract
    const room = await ChatRoom.findOne({
      contextType: ChatContextType.CONTRACT,
      contextId: new mongoose.Types.ObjectId(contractId.toString()),
    });

    if (!room) {
      return null;
    }

    return this.createEvent({
      roomId: room._id,
      eventType,
      entityType: ChatEventEntityType.MILESTONE,
      entityId: milestoneId,
      summary,
      data: {
        milestoneId: milestoneId.toString(),
        contractId: contractId.toString(),
        ...data,
      },
    });
  }

  /**
   * Create payment event message
   * @covers AC-EV-040, AC-EV-041, AC-EV-042, AC-EV-043, AC-EV-044
   */
  async createPaymentEvent(params: {
    paymentId: mongoose.Types.ObjectId | string;
    roomId: mongoose.Types.ObjectId | string;
    eventType: ChatEventType;
    summary: string;
    data?: Record<string, unknown>;
  }): Promise<IChatMessage> {
    const { paymentId, roomId, eventType, summary, data } = params;

    return this.createEvent({
      roomId,
      eventType,
      entityType: ChatEventEntityType.PAYMENT,
      entityId: paymentId,
      summary,
      data: {
        paymentId: paymentId.toString(),
        ...data,
      },
    });
  }
}

// Export singleton instance
export const chatEventService = new ChatEventService();
