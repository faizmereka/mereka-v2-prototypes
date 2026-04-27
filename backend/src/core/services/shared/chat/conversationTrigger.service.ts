// src/core/services/shared/chat/conversationTrigger.service.ts
// @spec: specs/messaging/messaging-conversation-triggers_spec.md
// @covers AC-CT-001 through AC-CT-052

import {
  ChatEventEntityType,
  ChatEventType,
  ChatMessage,
  ChatMessageType,
} from '@core/models/ChatMessage';
import {
  ChatContextType,
  ChatInitiatedBy,
  ChatParticipantStatus,
  ChatParticipantType,
  ChatRoom,
  ChatRoomStatus,
  type IChatParticipant,
} from '@core/models/ChatRoom';
import { ChatUserState } from '@core/models/ChatUserState';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import mongoose from 'mongoose';

// ============================================
// TYPES
// ============================================

interface CreateBookingRoomParams {
  bookingId: mongoose.Types.ObjectId | string;
  hubId: mongoose.Types.ObjectId | string;
  learnerId: mongoose.Types.ObjectId | string;
  serviceId: mongoose.Types.ObjectId | string;
  serviceType: 'experience' | 'expertise';
  serviceName: string;
  bookingDate?: Date;
}

interface CreateProposalRoomParams {
  proposalId: mongoose.Types.ObjectId | string;
  jobId: mongoose.Types.ObjectId | string;
  clientHubId: mongoose.Types.ObjectId | string;
  expertHubId: mongoose.Types.ObjectId | string;
  jobTitle: string;
  proposedAmount?: number;
}

interface TransitionProposalToContractParams {
  proposalId: mongoose.Types.ObjectId | string;
  contractId: mongoose.Types.ObjectId | string;
  contractTitle?: string;
}

interface CreateContractRoomParams {
  contractId: mongoose.Types.ObjectId | string;
  jobId?: mongoose.Types.ObjectId | string;
  clientHubId: mongoose.Types.ObjectId | string;
  expertHubId: mongoose.Types.ObjectId | string;
  contractTitle: string;
}

// ============================================
// LOGGER (simple console for now)
// ============================================

const logger = {
  error: (data: Record<string, unknown>, message: string) => {
    console.error(`[ConversationTrigger] ${message}`, data);
  },
  info: (data: Record<string, unknown>, message: string) => {
    console.info(`[ConversationTrigger] ${message}`, data);
  },
};

// ============================================
// SERVICE CLASS
// ============================================

class ConversationTriggerService {
  /**
   * Create chat room for a new booking
   * @covers AC-CT-001, AC-CT-002, AC-CT-003, AC-CT-004, AC-CT-005, AC-CT-006
   */
  async createBookingRoom(params: CreateBookingRoomParams): Promise<void> {
    try {
      const { bookingId, hubId, learnerId, serviceId, serviceType, serviceName, bookingDate } =
        params;

      // Fetch hub and learner info for snapshots
      const [hub, learner] = await Promise.all([
        Hub.findById(hubId).select('name logo').lean(),
        User.findById(learnerId).select('name email profilePhoto').lean(),
      ]);

      if (!hub || !learner) {
        logger.error(
          {
            bookingId: bookingId.toString(),
            hubId: hubId.toString(),
            learnerId: learnerId.toString(),
          },
          'Hub or learner not found for booking room creation',
        );
        return;
      }

      // Create chat room with BOOKING context
      const room = await ChatRoom.create({
        contextType: ChatContextType.BOOKING,
        contextId: new mongoose.Types.ObjectId(bookingId.toString()),
        contextSnapshot: {
          title: serviceName,
          status: 'ACTIVE',
        },
        hubId: new mongoose.Types.ObjectId(hubId.toString()),
        hubSnapshot: {
          name: hub.name,
          logo: hub.logo,
        },
        learnerId: new mongoose.Types.ObjectId(learnerId.toString()),
        learnerSnapshot: {
          name: learner.name || learner.email,
          email: learner.email,
          avatar: learner.profilePhoto,
        },
        participants: [
          {
            userId: new mongoose.Types.ObjectId(learnerId.toString()),
            name: learner.name || learner.email,
            email: learner.email,
            avatar: learner.profilePhoto,
            type: ChatParticipantType.LEARNER,
            status: ChatParticipantStatus.JOINED,
            isAssigned: false,
            joinedAt: new Date(),
          } as IChatParticipant,
        ],
        participantIds: [new mongoose.Types.ObjectId(learnerId.toString())],
        messageCount: 1,
        initiatedBy: ChatInitiatedBy.LEARNER,
        status: ChatRoomStatus.ACTIVE,
        createdBy: new mongoose.Types.ObjectId(learnerId.toString()),
      });

      // Create ChatUserState for learner
      await ChatUserState.create({
        roomId: room._id,
        userId: new mongoose.Types.ObjectId(learnerId.toString()),
        unreadCount: 0,
        isArchived: false,
        isMuted: false,
        isPinned: false,
        hasViewed: true,
      });

      // AC-CT-006: Create first system event message
      const dateStr = bookingDate
        ? bookingDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        : '';
      const summary = dateStr
        ? `Booking requested for ${serviceName} on ${dateStr}`
        : `Booking requested for ${serviceName}`;

      const eventMessage = await ChatMessage.create({
        roomId: room._id,
        sender: {
          userId: new mongoose.Types.ObjectId(learnerId.toString()),
          name: 'System',
          type: 'HUB_TEAM',
        },
        type: ChatMessageType.EVENT,
        event: {
          eventType: ChatEventType.BOOKING_REQUESTED,
          entityType: ChatEventEntityType.BOOKING,
          entityId: new mongoose.Types.ObjectId(bookingId.toString()),
          summary,
          data: {
            bookingId: bookingId.toString(),
            serviceId: serviceId.toString(),
            serviceType,
            serviceName,
            bookingDate: bookingDate?.toISOString(),
          },
        },
      });

      // Update room's lastMessage
      await ChatRoom.findByIdAndUpdate(room._id, {
        lastMessage: {
          _id: eventMessage._id,
          preview: summary,
          sentAt: eventMessage.createdAt,
          senderName: 'System',
        },
      });

      logger.info(
        { bookingId: bookingId.toString(), roomId: room._id.toString() },
        'Booking chat room created',
      );
    } catch (error) {
      // AC-CT-050: If chat room creation fails, booking creation MUST NOT fail
      // AC-CT-051: Failed chat room creation MUST be logged for retry
      logger.error(
        { error, bookingId: params.bookingId.toString() },
        'Failed to create chat room for booking',
      );
    }
  }

  /**
   * Create chat room for a new proposal
   * @covers AC-CT-010, AC-CT-011, AC-CT-012, AC-CT-013
   */
  async createProposalRoom(params: CreateProposalRoomParams): Promise<void> {
    try {
      const { proposalId, jobId, clientHubId, expertHubId, jobTitle, proposedAmount } = params;

      // Fetch hub info for snapshots
      const [clientHub, expertHub] = await Promise.all([
        Hub.findById(clientHubId).select('name logo').lean(),
        Hub.findById(expertHubId).select('name logo').lean(),
      ]);

      if (!clientHub || !expertHub) {
        logger.error(
          {
            proposalId: proposalId.toString(),
            clientHubId: clientHubId.toString(),
            expertHubId: expertHubId.toString(),
          },
          'Hub not found for proposal room creation',
        );
        return;
      }

      // Create chat room with PROPOSAL context (hub-to-hub chat)
      const room = await ChatRoom.create({
        contextType: ChatContextType.PROPOSAL,
        contextId: new mongoose.Types.ObjectId(proposalId.toString()),
        contextSnapshot: {
          title: jobTitle,
          status: 'PENDING',
        },
        hubId: new mongoose.Types.ObjectId(clientHubId.toString()),
        hubSnapshot: {
          name: clientHub.name,
          logo: clientHub.logo,
        },
        otherHubId: new mongoose.Types.ObjectId(expertHubId.toString()),
        otherHubSnapshot: {
          name: expertHub.name,
          logo: expertHub.logo,
        },
        participants: [],
        participantIds: [],
        messageCount: 1,
        initiatedBy: ChatInitiatedBy.HUB,
        status: ChatRoomStatus.ACTIVE,
        createdBy: new mongoose.Types.ObjectId(expertHubId.toString()),
      });

      // Create first system event message
      const amountStr = proposedAmount ? ` for ${proposedAmount}` : '';
      const summary = `Proposal submitted${amountStr}: "${jobTitle}"`;

      const eventMessage = await ChatMessage.create({
        roomId: room._id,
        sender: {
          userId: new mongoose.Types.ObjectId(),
          name: 'System',
          type: 'HUB_TEAM',
        },
        type: ChatMessageType.EVENT,
        event: {
          eventType: ChatEventType.PROPOSAL_SUBMITTED,
          entityType: ChatEventEntityType.PROPOSAL,
          entityId: new mongoose.Types.ObjectId(proposalId.toString()),
          summary,
          data: {
            proposalId: proposalId.toString(),
            jobId: jobId.toString(),
            proposedAmount,
          },
        },
      });

      // Update room's lastMessage
      await ChatRoom.findByIdAndUpdate(room._id, {
        lastMessage: {
          _id: eventMessage._id,
          preview: summary,
          sentAt: eventMessage.createdAt,
          senderName: 'System',
        },
      });

      logger.info(
        { proposalId: proposalId.toString(), roomId: room._id.toString() },
        'Proposal chat room created',
      );
    } catch (error) {
      logger.error(
        { error, proposalId: params.proposalId.toString() },
        'Failed to create chat room for proposal',
      );
    }
  }

  /**
   * Transition proposal room to contract
   * @covers AC-CT-020, AC-CT-021, AC-CT-022, AC-CT-023, AC-CT-024
   */
  async transitionProposalToContract(params: TransitionProposalToContractParams): Promise<void> {
    try {
      const { proposalId, contractId, contractTitle } = params;

      // Find existing proposal room
      const room = await ChatRoom.findOne({
        contextType: ChatContextType.PROPOSAL,
        contextId: new mongoose.Types.ObjectId(proposalId.toString()),
      });

      if (!room) {
        logger.error(
          { proposalId: proposalId.toString() },
          'Proposal room not found for contract transition',
        );
        return;
      }

      // AC-CT-021, AC-CT-022: Update context from PROPOSAL to CONTRACT
      room.contextType = ChatContextType.CONTRACT;
      room.contextId = new mongoose.Types.ObjectId(contractId.toString());
      if (contractTitle) {
        room.contextSnapshot = {
          ...room.contextSnapshot,
          title: contractTitle,
          status: 'ACTIVE',
        };
      } else {
        room.contextSnapshot = {
          ...room.contextSnapshot,
          status: 'ACTIVE',
        };
      }

      await room.save();

      // AC-CT-023: Create event message for transition
      const summary = 'Proposal accepted! Contract created.';

      const eventMessage = await ChatMessage.create({
        roomId: room._id,
        sender: {
          userId: new mongoose.Types.ObjectId(),
          name: 'System',
          type: 'HUB_TEAM',
        },
        type: ChatMessageType.EVENT,
        event: {
          eventType: ChatEventType.PROPOSAL_ACCEPTED,
          entityType: ChatEventEntityType.CONTRACT,
          entityId: new mongoose.Types.ObjectId(contractId.toString()),
          summary,
          data: {
            proposalId: proposalId.toString(),
            contractId: contractId.toString(),
          },
        },
      });

      // Update room's lastMessage
      await ChatRoom.findByIdAndUpdate(room._id, {
        lastMessage: {
          _id: eventMessage._id,
          preview: summary,
          sentAt: eventMessage.createdAt,
          senderName: 'System',
        },
        $inc: { messageCount: 1 },
      });

      logger.info(
        {
          proposalId: proposalId.toString(),
          contractId: contractId.toString(),
          roomId: room._id.toString(),
        },
        'Proposal room transitioned to contract',
      );
    } catch (error) {
      logger.error(
        {
          error,
          proposalId: params.proposalId.toString(),
          contractId: params.contractId.toString(),
        },
        'Failed to transition proposal room to contract',
      );
    }
  }

  /**
   * Create chat room for a contract (when not from proposal)
   * @covers AC-CT-030
   */
  async createContractRoom(params: CreateContractRoomParams): Promise<void> {
    try {
      const { contractId, jobId, clientHubId, expertHubId, contractTitle } = params;

      // Check if room already exists (from proposal)
      const existingRoom = await ChatRoom.findOne({
        contextType: ChatContextType.CONTRACT,
        contextId: new mongoose.Types.ObjectId(contractId.toString()),
      });

      if (existingRoom) {
        return; // Room already exists
      }

      // Fetch hub info
      const [clientHub, expertHub] = await Promise.all([
        Hub.findById(clientHubId).select('name logo').lean(),
        Hub.findById(expertHubId).select('name logo').lean(),
      ]);

      if (!clientHub || !expertHub) {
        logger.error(
          { contractId: contractId.toString() },
          'Hub not found for contract room creation',
        );
        return;
      }

      // Create chat room
      const room = await ChatRoom.create({
        contextType: ChatContextType.CONTRACT,
        contextId: new mongoose.Types.ObjectId(contractId.toString()),
        contextSnapshot: {
          title: contractTitle,
          status: 'PENDING',
        },
        hubId: new mongoose.Types.ObjectId(clientHubId.toString()),
        hubSnapshot: {
          name: clientHub.name,
          logo: clientHub.logo,
        },
        otherHubId: new mongoose.Types.ObjectId(expertHubId.toString()),
        otherHubSnapshot: {
          name: expertHub.name,
          logo: expertHub.logo,
        },
        participants: [],
        participantIds: [],
        messageCount: 1,
        initiatedBy: ChatInitiatedBy.HUB,
        status: ChatRoomStatus.ACTIVE,
        createdBy: new mongoose.Types.ObjectId(clientHubId.toString()),
      });

      // Create first system event message
      const summary = `Contract offer sent: "${contractTitle}"`;

      const eventMessage = await ChatMessage.create({
        roomId: room._id,
        sender: {
          userId: new mongoose.Types.ObjectId(),
          name: 'System',
          type: 'HUB_TEAM',
        },
        type: ChatMessageType.EVENT,
        event: {
          eventType: ChatEventType.CONTRACT_STARTED,
          entityType: ChatEventEntityType.CONTRACT,
          entityId: new mongoose.Types.ObjectId(contractId.toString()),
          summary,
          data: {
            contractId: contractId.toString(),
            jobId: jobId?.toString(),
          },
        },
      });

      // Update room's lastMessage
      await ChatRoom.findByIdAndUpdate(room._id, {
        lastMessage: {
          _id: eventMessage._id,
          preview: summary,
          sentAt: eventMessage.createdAt,
          senderName: 'System',
        },
      });

      logger.info(
        { contractId: contractId.toString(), roomId: room._id.toString() },
        'Contract chat room created',
      );
    } catch (error) {
      logger.error(
        { error, contractId: params.contractId.toString() },
        'Failed to create chat room for contract',
      );
    }
  }

  /**
   * Add contract event to chat room
   * @covers AC-CT-031, AC-CT-032, AC-CT-033, AC-CT-034
   */
  async addContractEvent(
    contractId: mongoose.Types.ObjectId | string,
    eventType: ChatEventType,
    summary: string,
    closeRoom = false,
  ): Promise<void> {
    try {
      const room = await ChatRoom.findOne({
        contextType: ChatContextType.CONTRACT,
        contextId: new mongoose.Types.ObjectId(contractId.toString()),
      });

      if (!room) {
        logger.error({ contractId: contractId.toString() }, 'Contract room not found for event');
        return;
      }

      // Create event message
      const eventMessage = await ChatMessage.create({
        roomId: room._id,
        sender: {
          userId: new mongoose.Types.ObjectId(),
          name: 'System',
          type: 'HUB_TEAM',
        },
        type: ChatMessageType.EVENT,
        event: {
          eventType,
          entityType: ChatEventEntityType.CONTRACT,
          entityId: new mongoose.Types.ObjectId(contractId.toString()),
          summary,
          data: { contractId: contractId.toString() },
        },
      });

      // Update room
      const updateData: Record<string, unknown> = {
        lastMessage: {
          _id: eventMessage._id,
          preview: summary,
          sentAt: eventMessage.createdAt,
          senderName: 'System',
        },
        $inc: { messageCount: 1 },
      };

      // AC-CT-034: Close room if contract cancelled
      if (closeRoom) {
        updateData.status = ChatRoomStatus.CLOSED;
      }

      await ChatRoom.findByIdAndUpdate(room._id, updateData);

      logger.info(
        { contractId: contractId.toString(), eventType },
        'Contract event added to chat room',
      );
    } catch (error) {
      logger.error(
        { error, contractId: contractId.toString() },
        'Failed to add contract event to chat room',
      );
    }
  }

  /**
   * Add booking review event to chat room
   * @covers AC-CT-040 (review submitted)
   */
  async addBookingReviewEvent(
    bookingId: mongoose.Types.ObjectId | string,
    reviewerName: string,
    rating: number,
    reviewId?: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    try {
      const room = await ChatRoom.findOne({
        contextType: ChatContextType.BOOKING,
        contextId: new mongoose.Types.ObjectId(bookingId.toString()),
      });

      if (!room) {
        logger.error(
          { bookingId: bookingId.toString() },
          'Booking room not found for review event',
        );
        return;
      }

      // Create star rating display
      const stars = '⭐'.repeat(Math.min(Math.max(Math.round(rating), 1), 5));
      const summary = `${reviewerName} left a review: ${stars} (${rating}/5)`;

      // Create event message
      const eventMessage = await ChatMessage.create({
        roomId: room._id,
        sender: {
          userId: new mongoose.Types.ObjectId(),
          name: 'System',
          type: 'HUB_TEAM',
        },
        type: ChatMessageType.EVENT,
        event: {
          eventType: ChatEventType.BOOKING_REVIEWED,
          entityType: ChatEventEntityType.BOOKING,
          entityId: new mongoose.Types.ObjectId(bookingId.toString()),
          summary,
          data: {
            bookingId: bookingId.toString(),
            reviewId: reviewId?.toString(),
            rating,
            reviewerName,
          },
        },
      });

      // Update room's lastMessage
      await ChatRoom.findByIdAndUpdate(room._id, {
        lastMessage: {
          _id: eventMessage._id,
          preview: summary,
          sentAt: eventMessage.createdAt,
          senderName: 'System',
        },
        $inc: { messageCount: 1 },
      });

      logger.info(
        { bookingId: bookingId.toString(), rating },
        'Booking review event added to chat room',
      );
    } catch (error) {
      logger.error(
        { error, bookingId: bookingId.toString() },
        'Failed to add booking review event to chat room',
      );
    }
  }

  /**
   * Add contract review event to chat room
   * @covers AC-CT-041 (contract review submitted)
   */
  async addContractReviewEvent(
    contractId: mongoose.Types.ObjectId | string,
    reviewerHubName: string,
    rating: number,
    reviewType: 'client_to_expert' | 'expert_to_client',
    reviewId?: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    try {
      const room = await ChatRoom.findOne({
        contextType: ChatContextType.CONTRACT,
        contextId: new mongoose.Types.ObjectId(contractId.toString()),
      });

      if (!room) {
        logger.error(
          { contractId: contractId.toString() },
          'Contract room not found for review event',
        );
        return;
      }

      // Create star rating display
      const stars = '⭐'.repeat(Math.min(Math.max(Math.round(rating), 1), 5));
      const reviewerLabel = reviewType === 'client_to_expert' ? 'Client' : 'Expert';
      const summary = `${reviewerHubName} (${reviewerLabel}) left a review: ${stars} (${rating}/5)`;

      // Create event message
      const eventMessage = await ChatMessage.create({
        roomId: room._id,
        sender: {
          userId: new mongoose.Types.ObjectId(),
          name: 'System',
          type: 'HUB_TEAM',
        },
        type: ChatMessageType.EVENT,
        event: {
          eventType: ChatEventType.CONTRACT_REVIEWED,
          entityType: ChatEventEntityType.CONTRACT,
          entityId: new mongoose.Types.ObjectId(contractId.toString()),
          summary,
          data: {
            contractId: contractId.toString(),
            reviewId: reviewId?.toString(),
            rating,
            reviewerHubName,
            reviewType,
          },
        },
      });

      // Update room's lastMessage
      await ChatRoom.findByIdAndUpdate(room._id, {
        lastMessage: {
          _id: eventMessage._id,
          preview: summary,
          sentAt: eventMessage.createdAt,
          senderName: 'System',
        },
        $inc: { messageCount: 1 },
      });

      logger.info(
        { contractId: contractId.toString(), rating, reviewType },
        'Contract review event added to chat room',
      );
    } catch (error) {
      logger.error(
        { error, contractId: contractId.toString() },
        'Failed to add contract review event to chat room',
      );
    }
  }
}

// Export singleton instance
export const conversationTriggerService = new ConversationTriggerService();
