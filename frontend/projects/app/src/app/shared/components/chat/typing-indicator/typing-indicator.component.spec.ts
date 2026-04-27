import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TypingIndicatorComponent } from './typing-indicator.component';
import type { TypingUser } from '@mereka/models';

/**
 * Test Suite for TypingIndicatorComponent
 * @spec specs/messaging/messaging-fe-components_spec.md
 * @covers AC-FEC-080 through AC-FEC-085
 */

describe('TypingIndicatorComponent', () => {
  let component: TypingIndicatorComponent;
  let fixture: ComponentFixture<TypingIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypingIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TypingIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ==========================================================================
  // Component Creation
  // ==========================================================================

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ==========================================================================
  // AC-FEC-080: Users input
  // ==========================================================================

  describe('AC-FEC-080: Users Input', () => {
    it('should have empty users by default', () => {
      expect(component.users()).toHaveLength(0);
    });

    it('should accept users input', () => {
      const users: TypingUser[] = [{ userId: 'user-1', name: 'John' }];
      fixture.componentRef.setInput('users', users);
      fixture.detectChanges();

      expect(component.users()).toHaveLength(1);
    });
  });

  // ==========================================================================
  // AC-FEC-081: Single user typing
  // ==========================================================================

  describe('AC-FEC-081: Single User Typing', () => {
    it('should display "X is typing" for single user', () => {
      const users: TypingUser[] = [{ userId: 'user-1', name: 'John' }];
      fixture.componentRef.setInput('users', users);
      fixture.detectChanges();

      expect(component.displayText()).toBe('John is typing');
    });
  });

  // ==========================================================================
  // AC-FEC-082: Two users typing
  // ==========================================================================

  describe('AC-FEC-082: Two Users Typing', () => {
    it('should display "X and Y are typing" for two users', () => {
      const users: TypingUser[] = [
        { userId: 'user-1', name: 'John' },
        { userId: 'user-2', name: 'Jane' },
      ];
      fixture.componentRef.setInput('users', users);
      fixture.detectChanges();

      expect(component.displayText()).toBe('John and Jane are typing');
    });
  });

  // ==========================================================================
  // AC-FEC-083: Multiple users typing
  // ==========================================================================

  describe('AC-FEC-083: Multiple Users Typing', () => {
    it('should display "Multiple people are typing" for 3+ users', () => {
      const users: TypingUser[] = [
        { userId: 'user-1', name: 'John' },
        { userId: 'user-2', name: 'Jane' },
        { userId: 'user-3', name: 'Bob' },
      ];
      fixture.componentRef.setInput('users', users);
      fixture.detectChanges();

      expect(component.displayText()).toBe('Multiple people are typing');
    });
  });

  // ==========================================================================
  // AC-FEC-085: Visibility
  // ==========================================================================

  describe('AC-FEC-085: Visibility', () => {
    it('should not be visible when no users typing', () => {
      expect(component.isVisible()).toBe(false);
    });

    it('should be visible when users are typing', () => {
      const users: TypingUser[] = [{ userId: 'user-1', name: 'John' }];
      fixture.componentRef.setInput('users', users);
      fixture.detectChanges();

      expect(component.isVisible()).toBe(true);
    });
  });

  // ==========================================================================
  // Empty state
  // ==========================================================================

  describe('Empty State', () => {
    it('should return empty string when no users', () => {
      expect(component.displayText()).toBe('');
    });
  });
});
