import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TypingUser } from '@mereka/models';

/**
 * TypingIndicator - "User is typing..." animation
 *
 * @covers AC-FEC-080 through AC-FEC-085
 */
@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './typing-indicator.component.html',
  styles: [`
    :host { display: block; flex-shrink: 0; }

    /* @covers AC-FEC-084 - Animated dots */
    .typing-dots span {
      animation: typing-dot 1.4s infinite ease-in-out;
    }
    .typing-dots span:nth-child(1) { animation-delay: 0s; }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing-dot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }
  `],
})
export class TypingIndicatorComponent {
  // @covers AC-FEC-080
  readonly users = input<TypingUser[]>([]);

  // @covers AC-FEC-081, AC-FEC-082, AC-FEC-083
  readonly displayText = computed(() => {
    const typingUsers = this.users();

    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing`;
    if (typingUsers.length === 2) return `${typingUsers[0].name} and ${typingUsers[1].name} are typing`;
    return 'Multiple people are typing';
  });

  // @covers AC-FEC-085
  readonly isVisible = computed(() => this.users().length > 0);
}
