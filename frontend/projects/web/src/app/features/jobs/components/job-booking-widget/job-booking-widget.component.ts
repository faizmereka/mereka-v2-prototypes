import {
  Component,
  input,
  inject,
  computed,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChatInitiationService } from '../../../../core/services/chat-initiation.service';
import { environment } from '../../../../../environments/environment';

/**
 * JobBookingWidgetComponent
 *
 * Sidebar widget for job detail page.
 * Handles:
 * - Displaying service category & type
 * - CTA buttons (Send Proposal / Sign up to apply)
 * - Share functionality
 */
@Component({
  selector: 'app-job-booking-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-booking-widget.component.html',
})
export class JobBookingWidgetComponent {
  private readonly jobService = inject(JobService);
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatInitiationService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Job ID (required) */
  readonly jobId = input.required<string>();

  /** Mobile mode flag */
  readonly isMobile = input<boolean>(false);

  /** Job data from service */
  readonly job = this.jobService.job;

  /** Check if user is logged in */
  readonly isLoggedIn = computed(() => this.authService.isLoggedIn());

  /** Welcome URL for non-logged in users */
  readonly welcomeUrl = `${environment.appUrls.app}/welcome/expert`;

  /** State for chat initiation loading */
  readonly startingChat = signal(false);

  sendProposal(): void {
    const job = this.job();
    if (job && isPlatformBrowser(this.platformId)) {
      // Redirect to checkout.mereka.io for proposal submission
      window.location.href = `${environment.appUrls.checkout}/proposal/${job._id}`;
    }
  }

  signUp(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = this.welcomeUrl;
    }
  }

  share(): void {
    const job = this.job();
    if (job && isPlatformBrowser(this.platformId) && navigator.share) {
      navigator.share({
        title: job.jobTitle,
        text: job.jobSummary || 'Check out this job opportunity',
        url: window.location.href,
      });
    }
  }

  /**
   * Contact hub about this job
   * Opens chat with the hub, with this job as context
   */
  async contactHub(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const job = this.job();
    if (!job?.hub?._id) {
      console.error('No job or hub available');
      return;
    }

    this.startingChat.set(true);
    try {
      await this.chatService.initiateChat({
        hubId: job.hub._id,
        contextType: 'JOB',
        contextId: job._id,
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      this.startingChat.set(false);
    }
  }
}
