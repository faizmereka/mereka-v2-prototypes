import {
  Component,
  input,
  output,
  signal,
  effect,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-hold-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (expiresAt()) {
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
        [class]="timerClass()"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ formattedTime() }}</span>
      </div>
    }
  `,
})
export class HoldTimerComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  readonly expiresAt = input<string | null>(null);
  readonly expired = output<void>();

  readonly remainingSeconds = signal(0);
  readonly formattedTime = signal('--:--');
  readonly timerClass = signal('bg-neutral-100 text-neutral-700');

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const expiry = this.expiresAt();
      if (expiry && isPlatformBrowser(this.platformId)) {
        this.startTimer(expiry);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private startTimer(expiresAt: string): void {
    this.stopTimer();

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));

      this.remainingSeconds.set(remaining);
      this.formattedTime.set(this.formatTime(remaining));
      this.updateTimerClass(remaining);

      if (remaining <= 0) {
        this.stopTimer();
        this.expired.emit();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    this.intervalId = setInterval(updateTimer, 1000);
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private updateTimerClass(seconds: number): void {
    if (seconds <= 60) {
      // Less than 1 minute - red/urgent
      this.timerClass.set('bg-red-100 text-red-700 animate-pulse');
    } else if (seconds <= 180) {
      // Less than 3 minutes - warning
      this.timerClass.set('bg-amber-100 text-amber-700');
    } else {
      // Normal
      this.timerClass.set('bg-neutral-100 text-neutral-700');
    }
  }
}
