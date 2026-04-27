// src/core/services/shared/chat/chatParticipant.service.ts
// @spec: specs/messaging/messaging-participants_spec.md
// @covers AC-PT-001 through AC-PT-063

import {
  ChatEventEntityType,
  ChatEventType,
  ChatMessage,
  ChatMessageType,
} from '@core/models/ChatMessage';
import {
  ChatParticipantStatus,
  ChatParticipantType,
  ChatRoom,
  ChatRoomStatus,
  type IChatParticipant,
} from '@core/models/ChatRoom';
import { ChatUserState } from '@core/models/ChatUserState';
import mongoose from 'mongoose';

// ============================================
// TYPES
// ============================================

interface JoinRoomParams {
  roomId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  hubId: mongoose.Types.ObjectId | string;
  user: { name: string; email: string; avatar?: string };
}

interface LeaveRoomParams {
  roomId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
}

interface AssignMemberParams {
  roomId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  hubId: mongoose.Types.ObjectId | string;
  user: { name: string; email: string; avatar?: string };
  assignedBy: mongoose.Types.ObjectId | string;
  assignedByName: string;
}

interface UnassignMemberParams {
  roomId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  unassignedBy: mongoose.Types.ObjectId | string;
  unassignedByName: string;
}

// ============================================
// SERVICE CLASS
// ============================================

class ChatParticipantService {
  /**
   * Join a conversation
   * @covers AC-PT-010, AC-PT-011, AC-PT-012, AC-PT-013, AC-PT-014
   */
  async joinRoom(params: JoinRoomParams): Promise<IChatParticipant> {
    const { roomId, userId, hubId, user } = params;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if already a participant
    const existingParticipant = room.participants.find(
      (p) => p.userId.toString() === userId.toString(),
    );

    if (existingParticipant) {
      if (existingParticipant.status === ChatParticipantStatus.JOINED) {
        return existingParticipant;
      }

      // AC-PT-035: Rejoin if previously left
      existingParticipant.status = ChatParticipantStatus.JOINED;
      existingParticipant.joinedAt = new Date();
      existingParticipant.leftAt = undefined;

      // Add back to participantIds
      if (!room.participantIds.some((id) => id.toString() === userId.toString())) {
        room.participantIds.push(new mongoose.Types.ObjectId(userId.toString()));
      }

      await room.save();

      // Create rejoin event
      await this.createParticipantEvent(
        room._id,
        userId,
        user.name,
        ChatEventType.PARTICIPANT_JOINED,
        `${user.name} rejoined the conversation`,
      );

      return existingParticipant;
    }

    // AC-PT-011: Add new participant
    const newParticipant: IChatParticipant = {
      userId: new mongoose.Types.ObjectId(userId.toString()),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      type: ChatParticipantType.HUB_TEAM,
      hubId: new mongoose.Types.ObjectId(hubId.toString()),
      status: ChatParticipantStatus.JOINED,
      isAssigned: false,
      joinedAt: new Date(),
    };

    room.participants.push(newParticipant);
    room.participantIds.push(new mongoose.Types.ObjectId(userId.toString()));
    await room.save();

    // Create/update ChatUserState
    await ChatUserState.findOneAndUpdate(
      {
        roomId: room._id,
        userId: new mongoose.Types.ObjectId(userId.toString()),
      },
      {
        roomId: room._id,
        userId: new mongoose.Types.ObjectId(userId.toString()),
        hubId: new mongoose.Types.ObjectId(hubId.toString()),
        unreadCount: 0,
        isArchived: false,
        isMuted: false,
        isPinned: false,
        hasViewed: true,
      },
      { upsert: true, new: true },
    );

    // AC-PT-012: Create join event message
    await this.createParticipantEvent(
      room._id,
      userId,
      user.name,
      ChatEventType.PARTICIPANT_JOINED,
      `${user.name} joined the conversation`,
    );

    return newParticipant;
  }

  /**
   * Leave a conversation
   * @covers AC-PT-030, AC-PT-031, AC-PT-032, AC-PT-033, AC-PT-034
   */
  async leaveRoom(params: LeaveRoomParams): Promise<void> {
    const { roomId, userId } = params;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const participant = room.participants.find((p) => p.userId.toString() === userId.toString());

    if (!participant) {
      throw new Error('Not a participant');
    }

    // AC-PT-034: Learners cannot leave booking/contract rooms
    if (participant.type === ChatParticipantType.LEARNER) {
      throw new Error('Learners cannot leave this conversation');
    }

    // AC-PT-033: Must unassign before leaving
    if (participant.isAssigned) {
      throw new Error('Cannot leave while assigned. Please unassign first.');
    }

    // AC-PT-031: Update participant status
    participant.status = ChatParticipantStatus.LEFT;
    participant.leftAt = new Date();

    // Remove from participantIds array
    room.participantIds = room.participantIds.filter((id) => id.toString() !== userId.toString());

    await room.save();

    // AC-PT-032: Create leave event message
    await this.createParticipantEvent(
      room._id,
      userId,
      participant.name,
      ChatEventType.PARTICIPANT_LEFT,
      `${participant.name} left the conversation`,
    );
  }

  /**
   * Assign member to room
   * @covers AC-PT-020, AC-PT-021, AC-PT-022, AC-PT-023, AC-PT-024, AC-PT-026
   */
  async assignMember(params: AssignMemberParams): Promise<IChatParticipant> {
    const { roomId, userId, hubId, user, assignedBy, assignedByName } = params;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // AC-PT-024: Only ONE member can be assigned - unassign current first
    const currentlyAssigned = room.participants.find(
      (p) => p.isAssigned && p.status === ChatParticipantStatus.JOINED,
    );
    if (currentlyAssigned && currentlyAssigned.userId.toString() !== userId.toString()) {
      currentlyAssigned.isAssigned = false;
      currentlyAssigned.assignedAt = undefined;
      currentlyAssigned.assignedBy = undefined;
    }

    // Check if user is already a participant
    let participant = room.participants.find((p) => p.userId.toString() === userId.toString());

    // AC-PT-021: Auto-join if not already joined
    if (!participant) {
      participant = {
        userId: new mongoose.Types.ObjectId(userId.toString()),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        type: ChatParticipantType.HUB_TEAM,
        hubId: new mongoose.Types.ObjectId(hubId.toString()),
        status: ChatParticipantStatus.JOINED,
        isAssigned: false,
        joinedAt: new Date(),
      };
      room.participants.push(participant);
      room.participantIds.push(new mongoose.Types.ObjectId(userId.toString()));

      // Create ChatUserState
      await ChatUserState.findOneAndUpdate(
        { roomId: room._id, userId: new mongoose.Types.ObjectId(userId.toString()) },
        {
          roomId: room._id,
          userId: new mongoose.Types.ObjectId(userId.toString()),
          hubId: new mongoose.Types.ObjectId(hubId.toString()),
          unreadCount: 0,
          isArchived: false,
          isMuted: false,
          isPinned: false,
          hasViewed: true,
        },
        { upsert: true, new: true },
      );
    } else if (participant.status === ChatParticipantStatus.LEFT) {
      // Rejoin if previously left
      participant.status = ChatParticipantStatus.JOINED;
      participant.joinedAt = new Date();
      participant.leftAt = undefined;
      if (!room.participantIds.some((id) => id.toString() === userId.toString())) {
        room.participantIds.push(new mongoose.Types.ObjectId(userId.toString()));
      }
    }

    // AC-PT-022: Update assignment
    participant.isAssigned = true;
    participant.assignedAt = new Date();
    participant.assignedBy = new mongoose.Types.ObjectId(assignedBy.toString());

    await room.save();

    // AC-PT-023: Create assignment event
    const isSelfAssign = assignedBy.toString() === userId.toString();
    const summary = isSelfAssign
      ? `${user.name} self-assigned to this conversation`
      : `${user.name} was assigned by ${assignedByName}`;

    await this.createParticipantEvent(
      room._id,
      userId,
      user.name,
      ChatEventType.PARTICIPANT_ASSIGNED,
      summary,
      { assignedBy: assignedBy.toString() },
    );

    return participant;
  }

  /**
   * Unassign member from room
   * @covers AC-PT-025
   */
  async unassignMember(params: UnassignMemberParams): Promise<void> {
    const { roomId, userId, unassignedBy, unassignedByName } = params;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const participant = room.participants.find((p) => p.userId.toString() === userId.toString());

    if (!participant) {
      throw new Error('Not a participant');
    }

    if (!participant.isAssigned) {
      throw new Error('Member is not assigned');
    }

    participant.isAssigned = false;
    participant.assignedAt = undefined;
    participant.assignedBy = undefined;

    await room.save();

    // Create unassign event
    const isSelfUnassign = unassignedBy.toString() === userId.toString();
    const summary = isSelfUnassign
      ? `${participant.name} unassigned themselves`
      : `${participant.name} was unassigned by ${unassignedByName}`;

    await this.createParticipantEvent(
      room._id,
      userId,
      participant.name,
      ChatEventType.PARTICIPANT_UNASSIGNED,
      summary,
      { unassignedBy: unassignedBy.toString() },
    );
  }

  /**
   * Get participants for a room
   * @covers AC-PT-060
   */
  async getParticipants(roomId: mongoose.Types.ObjectId | string): Promise<IChatParticipant[]> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Return only active participants (status: JOINED)
    return room.participants.filter((p) => p.status === ChatParticipantStatus.JOINED);
  }

  /**
   * Get assigned member for a room
   */
  async getAssignedMember(
    roomId: mongoose.Types.ObjectId | string,
  ): Promise<IChatParticipant | null> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return null;
    }

    return (
      room.participants.find((p) => p.isAssigned && p.status === ChatParticipantStatus.JOINED) ||
      null
    );
  }

  /**
   * Check if user can send messages
   * @covers AC-PT-003, AC-PT-014
   */
  async canSendMessage(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<boolean> {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return false;
    }

    // Room must be active
    if (room.status !== ChatRoomStatus.ACTIVE) {
      return false;
    }

    // User must be a joined participant
    const participant = room.participants.find((p) => p.userId.toString() === userId.toString());

    if (!participant) {
      return false;
    }

    return participant.status === ChatParticipantStatus.JOINED;
  }

  /**
   * Handle hub member removal
   * @covers AC-PT-050, AC-PT-051
   */
  async handleMemberRemovedFromHub(
    userId: mongoose.Types.ObjectId | string,
    hubId: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    // Find all rooms where user is a participant for this hub
    const rooms = await ChatRoom.find({
      hubId: new mongoose.Types.ObjectId(hubId.toString()),
      participantIds: new mongoose.Types.ObjectId(userId.toString()),
    });

    for (const room of rooms) {
      const participant = room.participants.find((p) => p.userId.toString() === userId.toString());

      if (participant && participant.status === ChatParticipantStatus.JOINED) {
        participant.status = ChatParticipantStatus.LEFT;
        participant.leftAt = new Date();
        participant.isAssigned = false;

        room.participantIds = room.participantIds.filter(
          (id) => id.toString() !== userId.toString(),
        );

        await room.save();

        // Create event message
        await this.createParticipantEvent(
          room._id,
          userId,
          participant.name,
          ChatEventType.PARTICIPANT_LEFT,
          `${participant.name} was removed from the hub`,
          { reason: 'hub_member_removed' },
        );
      }
    }
  }

  /**
   * Mark room as viewed by user
   * @covers AC-PT-004
   */
  async markAsViewed(
    roomId: mongoose.Types.ObjectId | string,
    userId: mongoose.Types.ObjectId | string,
    hubId?: mongoose.Types.ObjectId | string,
  ): Promise<void> {
    await ChatUserState.findOneAndUpdate(
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: new mongoose.Types.ObjectId(userId.toString()),
      },
      {
        roomId: new mongoose.Types.ObjectId(roomId.toString()),
        userId: new mongoose.Types.ObjectId(userId.toString()),
        hubId: hubId ? new mongoose.Types.ObjectId(hubId.toString()) : undefined,
        hasViewed: true,
      },
      { upsert: true, new: true },
    );
  }

  /**
   * Helper: Create participant event message
   */
  private async createParticipantEvent(
    roomId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId | string,
    userName: string,
    eventType: ChatEventType,
    summary: string,
    additionalData: Record<string, unknown> = {},
  ): Promise<void> {
    await ChatMessage.create({
      roomId,
      sender: {
        userId: new mongoose.Types.ObjectId(userId.toString()),
        name: userName,
        type: 'HUB_TEAM',
      },
      type: ChatMessageType.EVENT,
      event: {
        eventType,
        entityType: ChatEventEntityType.PARTICIPANT,
        entityId: new mongoose.Types.ObjectId(userId.toString()),
        summary,
        data: { userId: userId.toString(), ...additionalData },
      },
    });
  }
}

// Export singleton instance
export const chatParticipantService = new ChatParticipantService();
