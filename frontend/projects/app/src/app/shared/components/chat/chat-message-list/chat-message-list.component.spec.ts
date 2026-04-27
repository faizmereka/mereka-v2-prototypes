import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ChatMessageListComponent } from './chat-message-list.component';
import type { ChatMessage } from '@mereka/models';

/**
 * Test Suite for ChatMessageListComponent
 * @spec specs/messaging/messaging-fe-components_spec.md
 * @covers AC-FEC-020 through AC-FEC-027
 */

// Mock messages
const createMockMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  _id: 'msg-1',
  roomId: 'room-1',
  sender: {
    userId: 'user-1',
    name: 'John',
    type: 'LEARNER',
  },
  type: 'TEXT',
  text: 'Hello!',
  createdAt: new Date().toISOString(),
  isDeleted: false,
  ...overrides,
});

describe('ChatMessageListComponent', () => {
  let component: ChatMessageListComponent;
  let fixture: ComponentFixture<ChatMessageListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMessageListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatMessageListComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('messages', []);
    fixture.componentRef.setInput('currentUserId', 'user-1');
    fixture.detectChanges();
  });

  // ==========================================================================
  // Component Creation
  // ==========================================================================

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ==========================================================================
  // AC-FEC-020: Message display
  // ==========================================================================

  describe('AC-FEC-020: Message Display', () => {
    it('should accept messages input', () => {
      const messages = [createMockMessage()];
      fixture.componentRef.setInput('messages', messages);
      fixture.detectChanges();

      expect(component.messages()).toHaveLength(1);
    });

    it('should accept currentUserId input', () => {
      expect(component.currentUserId()).toBe('user-1');
    });
  });

  // ==========================================================================
  // AC-FEC-022: Date separators
  // ==========================================================================

  describe('AC-FEC-022: Date Separators', () => {
    it('should show date header for first message', () => {
      const messages = [createMockMessage()];
      fixture.componentRef.setInput('messages', messages);
      fixture.detectChanges();

      expect(component.isNewDay(0)).toBe(true);
    });

    it('should show date header when day changes', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const messages = [
        createMockMessage({ _id: 'msg-1', createdAt: yesterday.toISOString() }),
        createMockMessage({ _id: 'msg-2', createdAt: today.toISOString() }),
      ];
      fixture.componentRef.setInput('messages', messages);
      fixture.detectChanges();

      expect(component.isNewDay(0)).toBe(true);
      expect(component.isNewDay(1)).toBe(true);
    });

    it('should not show date header for same day', () => {
      const now = new Date();
      const messages = [
        createMockMessage({ _id: 'msg-1', createdAt: now.toISOString() }),
        createMockMessage({ _id: 'msg-2', createdAt: now.toISOString() }),
      ];
      fixture.componentRef.setInput('messages', messages);
      fixture.detectChanges();

      expect(component.isNewDay(0)).toBe(true);
      expect(component.isNewDay(1)).toBe(false);
    });
  });

  // ==========================================================================
  // Date formatting
  // ==========================================================================

  describe('Date Formatting', () => {
    it('should format today as "Today"', () => {
      const today = new Date().toISOString();
      expect(component.formatDateHeader(today)).toBe('Today');
    });

    it('should format yesterday as "Yesterday"', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(component.formatDateHeader(yesterday.toISOString())).toBe('Yesterday');
    });

    it('should format older dates with full format', () => {
      const oldDate = new Date('2024-01-15');
      const formatted = component.formatDateHeader(oldDate.toISOString());
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
    });
  });

  // ==========================================================================
  // AC-FEC-025: Own message detection
  // ==========================================================================

  describe('AC-FEC-025: Own Message Detection', () => {
    it('should identify own messages', () => {
      const ownMessage = createMockMessage({ sender: { userId: 'user-1', name: 'Me', type: 'LEARNER' } });
      expect(component.isOwnMessage(ownMessage)).toBe(true);
    });

    it('should identify other messages', () => {
      const otherMessage = createMockMessage({ sender: { userId: 'user-2', name: 'Other', type: 'HUB_TEAM' } });
      expect(component.isOwnMessage(otherMessage)).toBe(false);
    });
  });

  // ==========================================================================
  // Event messages
  // ==========================================================================

  describe('Event Messages', () => {
    it('should identify event messages', () => {
      const eventMessage = createMockMessage({ type: 'EVENT' });
      expect(component.isEventMessage(eventMessage)).toBe(true);
    });

    it('should not identify text messages as events', () => {
      const textMessage = createMockMessage({ type: 'TEXT' });
      expect(component.isEventMessage(textMessage)).toBe(false);
    });
  });

  // ==========================================================================
  // AC-FEC-024: Load more
  // ==========================================================================

  describe('AC-FEC-024: Load More', () => {
    it('should emit loadMore output', () => {
      const loadMoreSpy = vi.spyOn(component.loadMore, 'emit');

      fixture.componentRef.setInput('hasMore', true);
      fixture.componentRef.setInput('isLoading', false);
      fixture.detectChanges();

      // Simulate scroll near top
      const scrollEvent = {
        target: {
          scrollTop: 50,
          scrollHeight: 1000,
          clientHeight: 500,
        },
      } as unknown as Event;

      component.onScroll(scrollEvent);

      expect(loadMoreSpy).toHaveBeenCalled();
    });

    it('should not load more when already loading', () => {
      const loadMoreSpy = vi.spyOn(component.loadMore, 'emit');

      fixture.componentRef.setInput('hasMore', true);
      fixture.componentRef.setInput('isLoading', true);
      fixture.detectChanges();

      const scrollEvent = {
        target: { scrollTop: 50, scrollHeight: 1000, clientHeight: 500 },
      } as unknown as Event;

      component.onScroll(scrollEvent);

      expect(loadMoreSpy).not.toHaveBeenCalled();
    });

    it('should not load more when no more messages', () => {
      const loadMoreSpy = vi.spyOn(component.loadMore, 'emit');

      fixture.componentRef.setInput('hasMore', false);
      fixture.detectChanges();

      const scrollEvent = {
        target: { scrollTop: 50, scrollHeight: 1000, clientHeight: 500 },
      } as unknown as Event;

      component.onScroll(scrollEvent);

      expect(loadMoreSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Delete message
  // ==========================================================================

  describe('Delete Message', () => {
    it('should emit deleteMessage with message ID', () => {
      const deleteSpy = vi.spyOn(component.deleteMessage, 'emit');

      component.onDeleteMessage('msg-123');

      expect(deleteSpy).toHaveBeenCalledWith('msg-123');
    });
  });
});
