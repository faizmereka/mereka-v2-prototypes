import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HubChatsComponent } from './chats.component';
import { HubChatService } from '../../services/hub-chat.service';
import { ChatSocketService } from '../../services/chat-socket.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import type { ChatRoomListItem, ChatMessage } from '@mereka/models';

/**
 * Test Suite for HubChatsComponent
 * @spec specs/messaging/messaging-fe-hub-inbox_spec.md
 * @covers AC-FEH-001 through AC-FEH-092
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
      preview: 'Hello there!',
      sentAt: new Date().toISOString(),
      senderName: 'John',
    },
    participants: [],
    participantIds: ['user-1', 'learner-1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  userState: {
    roomId: 'room-1',
    userId: 'user-1',
    hubId: 'hub-1',
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
    userId: 'user-1',
    name: 'John Doe',
    type: 'LEARNER',
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
  typingUsersForSelectedRoom: signal<{ userId: string; userName: string }[]>([]),
  filterCounts: signal({ all: 10, unread: 3, assigned: 5, unassigned: 2 }),
  contextCounts: signal({ EXPERTISE: 5, EXPERIENCE: 2, BOOKING: 2, JOB: 1, CONTRACT: 0 }),
  loadRooms: vi.fn().mockResolvedValue(undefined),
  getTotalUnread: vi.fn().mockResolvedValue(3),
  getFilterCounts: vi.fn().mockResolvedValue(undefined),
  setFilter: vi.fn(),
  setSearch: vi.fn(),
  setContextFilter: vi.fn(),
  selectRoom: vi.fn().mockResolvedValue(undefined),
  clearSelectedRoom: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  loadMoreMessages: vi.fn(),
  assignToSelf: vi.fn().mockResolvedValue(undefined),
  unassign: vi.fn().mockResolvedValue(undefined),
  joinRoom: vi.fn().mockResolvedValue(undefined),
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
  user: signal({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
});

// ============================================================================
// Test Suite
// ============================================================================

describe('HubChatsComponent', () => {
  let component: HubChatsComponent;
  let fixture: ComponentFixture<HubChatsComponent>;
  let mockChatService: ReturnType<typeof createMockChatService>;
  let mockSocketService: ReturnType<typeof createMockSocketService>;
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  beforeEach(async () => {
    mockChatService = createMockChatService();
    mockSocketService = createMockSocketService();
    mockAuthService = createMockAuthService();

    await TestBed.configureTestingModule({
      imports: [HubChatsComponent],
      providers: [
        { provide: HubChatService, useValue: mockChatService },
        { provide: ChatSocketService, useValue: mockSocketService },
        { provide: AuthStateService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HubChatsComponent);
    component = fixture.componentInstance;
  });

  // ==========================================================================
  // AC-FEH-001: Component Creation
  // ==========================================================================

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ==========================================================================
  // AC-FEH-060: Load inbox on init
  // ==========================================================================

  describe('AC-FEH-060: Initialization', () => {
    it('should load rooms on init', async () => {
      component.ngOnInit();
      expect(mockChatService.loadRooms).toHaveBeenCalled();
    });

    it('should get total unread on init', async () => {
      component.ngOnInit();
      expect(mockChatService.getTotalUnread).toHaveBeenCalled();
    });

    it('should get filter counts on init', async () => {
      component.ngOnInit();
      expect(mockChatService.getFilterCounts).toHaveBeenCalled();
    });

    it('should connect socket on init', async () => {
      component.ngOnInit();
      expect(mockSocketService.connect).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AC-FEH-010: Filter tabs
  // ==========================================================================

  describe('AC-FEH-010: Filters', () => {
    it('should have 4 filter options', () => {
      expect(component.filters.length).toBe(4);
    });

    it('should have correct filter values', () => {
      const filterValues = component.filters.map((f) => f.value);
      expect(filterValues).toContain('all');
      expect(filterValues).toContain('unread');
      expect(filterValues).toContain('assigned');
      expect(filterValues).toContain('unassigned');
    });
  });

  // ==========================================================================
  // AC-FEH-012: Set filter
  // ==========================================================================

  describe('AC-FEH-012: Set Filter', () => {
    it('should update active filter', () => {
      component.setFilter('unread');
      expect(component.activeFilter()).toBe('unread');
    });

    it('should call service setFilter', () => {
      component.setFilter('assigned');
      expect(mockChatService.setFilter).toHaveBeenCalledWith('assigned');
    });
  });

  // ==========================================================================
  // AC-FEH-014: Context sub-filters
  // ==========================================================================

  describe('AC-FEH-014: Context Filters', () => {
    it('should have 5 context filter options', () => {
      expect(component.contextFilters.length).toBe(5);
    });

    it('should toggle context filters visibility', () => {
      expect(component.showContextFilters()).toBe(false);
      component.toggleContextFilters();
      expect(component.showContextFilters()).toBe(true);
      component.toggleContextFilters();
      expect(component.showContextFilters()).toBe(false);
    });

    it('should set context filter', () => {
      component.setContextFilter('EXPERTISE');
      expect(component.activeContextFilter()).toBe('EXPERTISE');
      expect(mockChatService.setContextFilter).toHaveBeenCalledWith('EXPERTISE');
    });

    it('should clear context filter', () => {
      component.setContextFilter('EXPERTISE');
      component.setContextFilter(null);
      expect(component.activeContextFilter()).toBeNull();
    });
  });

  // ==========================================================================
  // AC-FEH-015, AC-FEH-016: Search
  // ==========================================================================

  describe('AC-FEH-015, AC-FEH-016: Search', () => {
    it('should update search text', () => {
      component.onSearchChange('test query');
      expect(component.searchText()).toBe('test query');
    });

    it('should call service setSearch', () => {
      component.onSearchChange('python');
      expect(mockChatService.setSearch).toHaveBeenCalledWith('python');
    });
  });

  // ==========================================================================
  // AC-FEH-023: Room selection
  // ==========================================================================

  describe('AC-FEH-023: Room Selection', () => {
    it('should select room via service', async () => {
      await component.selectRoom(mockRoom);
      expect(mockChatService.selectRoom).toHaveBeenCalledWith('room-1');
    });

    it('should join socket room', async () => {
      await component.selectRoom(mockRoom);
      expect(mockSocketService.joinRoom).toHaveBeenCalledWith('room-1');
    });

    it('should hide mobile list on selection', async () => {
      component.showMobileList.set(true);
      await component.selectRoom(mockRoom);
      expect(component.showMobileList()).toBe(false);
    });
  });

  // ==========================================================================
  // AC-FEH-004: Back to list
  // ==========================================================================

  describe('AC-FEH-004: Back to List', () => {
    it('should show mobile list', () => {
      component.showMobileList.set(false);
      component.backToList();
      expect(component.showMobileList()).toBe(true);
    });

    it('should clear selected room', () => {
      component.backToList();
      expect(mockChatService.clearSelectedRoom).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AC-FEH-070, AC-FEH-071: Send message
  // ==========================================================================

  describe('AC-FEH-070, AC-FEH-071: Send Message', () => {
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
  // AC-FEH-073: Typing indicator
  // ==========================================================================

  describe('AC-FEH-073: Typing Indicator', () => {
    beforeEach(() => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(HubChatsComponent).componentInstance;
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
  // AC-FEH-024: Load more messages
  // ==========================================================================

  describe('AC-FEH-024: Load More Messages', () => {
    it('should call loadMoreMessages', () => {
      component.onLoadMoreMessages();
      expect(mockChatService.loadMoreMessages).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AC-FEH-040 through AC-FEH-044: Assignment modal
  // ==========================================================================

  describe('AC-FEH-040-044: Assignment Modal', () => {
    it('should open assign modal', () => {
      component.openAssignModal();
      expect(component.showAssignModal()).toBe(true);
    });

    it('should close assign modal', () => {
      component.showAssignModal.set(true);
      component.closeAssignModal();
      expect(component.showAssignModal()).toBe(false);
    });
  });

  // ==========================================================================
  // AC-FEH-050: Assign to self / Join room
  // ==========================================================================

  describe('AC-FEH-050: Assign to Self', () => {
    beforeEach(() => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(HubChatsComponent).componentInstance;
    });

    it('should assign to self', async () => {
      await component.assignToSelf();
      expect(mockChatService.assignToSelf).toHaveBeenCalledWith('room-1');
    });

    it('should join room', async () => {
      await component.joinRoom();
      expect(mockChatService.joinRoom).toHaveBeenCalledWith('room-1');
    });
  });

  // ==========================================================================
  // AC-FEH-043: Unassign
  // ==========================================================================

  describe('AC-FEH-043: Unassign', () => {
    beforeEach(() => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(HubChatsComponent).componentInstance;
    });

    it('should unassign room', async () => {
      await component.unassign();
      expect(mockChatService.unassign).toHaveBeenCalledWith('room-1');
    });
  });

  // ==========================================================================
  // AC-FEH-051, AC-FEH-052: Archive
  // ==========================================================================

  describe('AC-FEH-051, AC-FEH-052: Archive', () => {
    beforeEach(() => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(HubChatsComponent).componentInstance;
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
  // AC-FEH-053: Mute
  // ==========================================================================

  describe('AC-FEH-053: Mute', () => {
    beforeEach(() => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(HubChatsComponent).componentInstance;
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
  // AC-FEH-031: Participant list
  // ==========================================================================

  describe('AC-FEH-031: Participant List', () => {
    it('should toggle participants visibility', () => {
      expect(component.showParticipants()).toBe(false);
      component.toggleParticipants();
      expect(component.showParticipants()).toBe(true);
      component.toggleParticipants();
      expect(component.showParticipants()).toBe(false);
    });
  });

  // ==========================================================================
  // UI Helpers
  // ==========================================================================

  describe('UI Helpers', () => {
    it('should get initials from name', () => {
      expect(component.getInitials('John Doe')).toBe('JD');
      expect(component.getInitials('Alice')).toBe('A');
      expect(component.getInitials('A B C D')).toBe('AB');
    });

    it('should check if room is active', () => {
      mockChatService.selectedRoomId = signal('room-1');
      component = TestBed.createComponent(HubChatsComponent).componentInstance;
      expect(component.isRoomActive(mockRoom)).toBe(true);
    });
  });

  // ==========================================================================
  // Actions Menu
  // ==========================================================================

  describe('Actions Menu', () => {
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
  // Cleanup
  // ==========================================================================

  describe('Cleanup', () => {
    it('should disconnect socket on destroy', () => {
      component.ngOnDestroy();
      expect(mockSocketService.disconnect).toHaveBeenCalled();
    });
  });
});
