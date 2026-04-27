import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LearnerChatsComponent } from './chats.component';
import { LearnerChatService } from '../../services/learner-chat.service';
import { ChatSocketService } from '../../../hub-dashboard/services/chat-socket.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import type { ChatRoomListItem, ChatMessage } from '@mereka/models';

/**
 * Test Suite for LearnerChatsComponent
 * @spec specs/messaging/messaging-fe-learner-inbox_spec.md
 * @covers AC-FEL-001 through AC-FEL-063
 */

// ============================================================================
// Mock Data
// ============================================================================

const mockRoom: ChatRoomListItem = {
  room: {
    _id: 'room-1',
    hubId: 'hub-1',
    learnerId: 'learner-1',
    contextType: 'EXPERTISE',
    contextId: 'expertise-1',
    contextSnapshot: { title: 'Python Course' },
    hubSnapshot: { name: 'Code Academy', logo: '/logo.png' },
    learnerSnapshot: { name: 'John Doe', email: 'john@example.com', avatar: '/avatar.png' },
    status: 'ACTIVE',
    messageCount: 10,
    lastMessage: {
      _id: 'msg-last',
      preview: 'Thanks for your question!',
      sentAt: new Date().toISOString(),
      senderName: 'Hub Team',
    },
    participants: [],
    participantIds: ['learner-1', 'hub-member-1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  userState: {
    roomId: 'room-1',
    userId: 'learner-1',
    isMuted: false,
    isArchived: false,
    isPinned: false,
    hasViewed: true,
    unreadCount: 3,
    lastReadAt: new Date().toISOString(),
  },
  isMember: true,
  isMuted: false,
  isArchived: false,
};

const mockMessage: ChatMessage = {
  _id: 'msg-1',
  roomId: 'room-1',
  sender: {
    userId: 'hub-member-1',
    name: 'Code Academy', // Privacy: shows hub name, not member name
    type: 'HUB_TEAM',
  },
  type: 'TEXT',
  text: 'Hello!',
  createdAt: new Date().toISOString(),
  isDeleted: false,
};

// ============================================================================
// Mock Services
// ============================================================================

const createMockChatService = () => ({
  filteredRooms: signal<ChatRoomListItem[]>([mockRoom]),
  messages: signal<ChatMessage[]>([mockMessage]),
  selectedRoomId: signal<string | null>(null),
  selectedRoom: signal<ChatRoomListItem | null>(null),
  totalUnread: signal(3),
  roomsLoading: signal(false),
  messagesLoading: signal(false),
  sendingMessage: signal(false),
  hasMoreMessages: signal(false),
  typingForSelectedRoom: signal<{ hubName: string } | null>(null),
  loadRooms: vi.fn().mockResolvedValue(undefined),
  getTotalUnread: vi.fn().mockResolvedValue(3),
  refreshRooms: vi.fn().mockResolvedValue(undefined),
  setSearch: vi.fn(),
  selectRoom: vi.fn().mockResolvedValue(undefined),
  clearSelectedRoom: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  loadMoreMessages: vi.fn(),
  archiveRoom: vi.fn().mockResolvedValue(undefined),
  unarchiveRoom: vi.fn().mockResolvedValue(undefined),
  muteRoom: vi.fn().mockResolvedValue(undefined),
  unmuteRoom: vi.fn().mockResolvedValue(undefined),
});

const createMockSocketService = () => ({
  connected: signal(true),
  reconnecting: signal(false),
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  sendTypingStart: vi.fn(),
  sendTypingStop: vi.fn(),
});

const createMockAuthService = () => ({
  user: signal({ id: 'learner-1', name: 'John Doe', email: 'john@example.com' }),
});

// ============================================================================
// Test Suite
// ============================================================================

describe('LearnerChatsComponent', () => {
  let component: LearnerChatsComponent;
  let fixture: ComponentFixture<LearnerChatsComponent>;
  let mockChatService: ReturnType<typeof createMockChatService>;
  let mockSocketService: ReturnType<typeof createMockSocketService>;
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  beforeEach(async () => {
    mockChatService = createMockChatService();
    mockSocketService = createMockSocketService();
    mockAuthService = createMockAuthService();

    await TestBed.configureTestingModule({
      imports: [LearnerChatsComponent],
      providers: [
        { provide: LearnerChatService, useValue: mockChatService },
        { provide: ChatSocketService, useValue: mockSocketService },
        { provide: AuthStateService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LearnerChatsComponent);
    component = fixture.componentInstance;
  });

  // ==========================================================================
  // AC-FEL-001: Component Creation
  // ==========================================================================

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ==========================================================================
  // AC-FEL-001: Page header
  // ==========================================================================

  describe('AC-FEL-001: Page Layout', () => {
    it('should have rooms signal from service', () => {
      expect(component.rooms).toBeDefined();
      expect(component.rooms()).toHaveLength(1);
    });

    it('should have messages signal from service', () => {
      expect(component.messages).toBeDefined();
    });
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================

  describe('Initialization', () => {
    it('should load rooms on init', async () => {
      component.ngOnInit();
      expect(mockChatService.loadRooms).toHaveBeenCalled();
    });

    it('should get total unread on init', async () => {
      component.ngOnInit();
      expect(mockChatService.getTotalUnread).toHaveBeenCalled();
    });

    it('should connect socket on init', async () => {
      component.ngOnInit();
      expect(mockSocketService.connect).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AC-FEL-016: Pull to refresh
  // ==========================================================================

  describe('AC-FEL-016: Pull to Refresh', () => {
    it('should refresh rooms', async () => {
      await component.onRefresh();
      expect(mockChatService.refreshRooms).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AC-FEL-020, AC-FEL-021, AC-FEL-022: Search
  // ==========================================================================

  describe('AC-FEL-020-022: Search', () => {
    it('should update search text', () => {
      component.onSearchChange('python');
      expect(component.searchText()).toBe('python');
    });

    it('should call service setSearch', () => {
      component.onSearchChange('course');
      expect(mockChatService.setSearch).toHaveBeenCalledWith('course');
    });
  });

  // ==========================================================================
  // AC-FEL-004: Room selection
  // ==========================================================================

  describe('AC-FEL-004: Room Selection', () => {
    it('should select room via service', async () => {
      await component.selectRoom(mockRoom);
      expect(mockChatService.selectRoom).toHaveBeenCalledWith('room-1');
    });

    it('should join socket room', async () => {
      await component.selectRoom(mockRoom);
      expect(mockSocketService.joinRoom).toHaveBeenCalledWith('room-1');
    });
  });

  // ==========================================================================
  // AC-FEL-032: Back button
  // ==========================================================================

  describe('AC-FEL-032: Back to List', () => {
    beforeEach(() => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(LearnerChatsComponent).componentInstance;
    });

    it('should clear selected room', () => {
      component.backToList();
      expect(mockChatService.clearSelectedRoom).toHaveBeenCalled();
    });

    it('should leave socket room', () => {
      component.backToList();
      expect(mockSocketService.leaveRoom).toHaveBeenCalledWith('room-1');
    });
  });

  // ==========================================================================
  // AC-FEL-040, AC-FEL-041, AC-FEL-042, AC-FEL-043: Send message
  // ==========================================================================

  describe('AC-FEL-040-043: Send Message', () => {
    it('should send message via service', async () => {
      await component.sendMessage({ text: 'Hello!' });
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello!', undefined);
    });

    it('should send message with files', async () => {
      const files = [new File([''], 'test.txt')];
      await component.sendMessage({ text: 'With file', files });
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('With file', files);
    });
  });

  // ==========================================================================
  // AC-FEL-050-052: Real-time updates / Typing
  // ==========================================================================

  describe('AC-FEL-050-052: Typing', () => {
    beforeEach(() => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(LearnerChatsComponent).componentInstance;
    });

    it('should send typing start', () => {
      component.onTyping(true);
      expect(mockSocketService.sendTypingStart).toHaveBeenCalledWith('room-1');
    });

    it('should send typing stop', () => {
      component.onTyping(false);
      expect(mockSocketService.sendTypingStop).toHaveBeenCalledWith('room-1');
    });
  });

  // ==========================================================================
  // Load more messages
  // ==========================================================================

  describe('Load More Messages', () => {
    it('should call loadMoreMessages', () => {
      component.onLoadMoreMessages();
      expect(mockChatService.loadMoreMessages).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AC-FEL-033: Actions menu (Archive/Mute)
  // ==========================================================================

  describe('AC-FEL-033: Actions', () => {
    it('should toggle actions menu', () => {
      expect(component.showActionsMenu()).toBe(false);
      component.toggleActionsMenu();
      expect(component.showActionsMenu()).toBe(true);
    });

    it('should close actions menu', () => {
      component.showActionsMenu.set(true);
      component.closeActionsMenu();
      expect(component.showActionsMenu()).toBe(false);
    });
  });

  // ==========================================================================
  // Archive room
  // ==========================================================================

  describe('Archive Room', () => {
    beforeEach(() => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(LearnerChatsComponent).componentInstance;
    });

    it('should archive room', async () => {
      await component.archiveRoom();
      expect(mockChatService.archiveRoom).toHaveBeenCalledWith('room-1');
    });

    it('should unarchive room', async () => {
      await component.unarchiveRoom();
      expect(mockChatService.unarchiveRoom).toHaveBeenCalledWith('room-1');
    });

    it('should close actions menu after archive', async () => {
      component.showActionsMenu.set(true);
      await component.archiveRoom();
      expect(component.showActionsMenu()).toBe(false);
    });
  });

  // ==========================================================================
  // Mute room
  // ==========================================================================

  describe('Mute Room', () => {
    beforeEach(() => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(LearnerChatsComponent).componentInstance;
    });

    it('should mute room', async () => {
      await component.muteRoom();
      expect(mockChatService.muteRoom).toHaveBeenCalledWith('room-1');
    });

    it('should unmute room', async () => {
      await component.unmuteRoom();
      expect(mockChatService.unmuteRoom).toHaveBeenCalledWith('room-1');
    });

    it('should close actions menu after mute', async () => {
      component.showActionsMenu.set(true);
      await component.muteRoom();
      expect(component.showActionsMenu()).toBe(false);
    });
  });

  // ==========================================================================
  // AC-FEL-060-063: Privacy (Hub team anonymity)
  // ==========================================================================

  describe('AC-FEL-060-063: Privacy', () => {
    it('should have typing users as array with hub name', () => {
      mockChatService.typingForSelectedRoom = signal({ hubName: 'Code Academy' });
      component = TestBed.createComponent(LearnerChatsComponent).componentInstance;

      const typingUsers = component.typingUsersArray();
      expect(typingUsers).toHaveLength(1);
      expect(typingUsers[0].name).toBe('Code Academy');
    });

    it('should return empty array when no one is typing', () => {
      expect(component.typingUsersArray()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // UI Helpers
  // ==========================================================================

  describe('UI Helpers', () => {
    it('should get initials from name', () => {
      expect(component.getInitials('Code Academy')).toBe('CA');
      expect(component.getInitials('Design')).toBe('D');
    });

    it('should check if room is active', () => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(LearnerChatsComponent).componentInstance;
      expect(component.isRoomActive(mockRoom)).toBe(true);
    });

    it('should get context label for EXPERTISE', () => {
      const label = component.getContextLabel(mockRoom.room);
      expect(label).toBe('About: Python Course');
    });

    it('should get context label for BOOKING', () => {
      const bookingRoom = {
        ...mockRoom.room,
        contextType: 'BOOKING' as const,
        contextSnapshot: { title: 'Consultation' },
      };
      const label = component.getContextLabel(bookingRoom);
      expect(label).toBe('Booking: Consultation');
    });

    it('should format time correctly', () => {
      const now = new Date();
      expect(component.formatTime(now.toISOString())).toBe('Just now');

      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(component.formatTime(fiveMinAgo.toISOString())).toBe('5m ago');

      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(component.formatTime(twoHoursAgo.toISOString())).toBe('2h ago');
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('Cleanup', () => {
    it('should disconnect socket on destroy', () => {
      component.ngOnDestroy();
      expect(mockSocketService.disconnect).toHaveBeenCalled();
    });
  });
});
