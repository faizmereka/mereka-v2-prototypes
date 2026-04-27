import {
  AfterViewInit,
  Component,
  HostListener,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';
import { MerekaLogoComponent } from '@mereka/ui/logo/site-logo/site-logo.component';
import { ViewBreakpointService } from '@mereka/core';
import { APP_URLS } from '@mereka/environments';

const FOOTER_MOBILE_BREAKPOINT = '(max-width: 768px)';

export type FooterPanelId = 'corporate' | 'marketplace' | 'academy' | 'space';

@Component({
  selector: 'site-footer',
  imports: [
    RouterModule,
    NgTemplateOutlet,
    MerekaLogoComponent,
    MatIcon,
    MatTooltip,
    UIAnchor,
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'common-footer',
  },
})
export class SiteFooter implements AfterViewInit {
  readonly currentYear = new Date().getFullYear();
  readonly siteBaseUrl = APP_URLS.web;
  view = inject(ViewBreakpointService);

  readonly panelCollapsed = signal<Record<FooterPanelId, boolean>>({
    corporate: true,
    marketplace: true,
    academy: true,
    space: true,
  });

  togglePanel(id: FooterPanelId): void {
    if (!this.view.isMobile()) return;
    this.panelCollapsed.update((s) => ({ ...s, [id]: !s[id] }));
    this.onPanelToggled();
  }

  isPanelCollapsed(id: FooterPanelId): boolean {
    return this.panelCollapsed()[id];
  }

  ngAfterViewInit(): void {
    this.updateFooterListHeight();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateFooterListHeight();
  }

  /** Call after panel toggle so expanded content gets correct scrollHeight. */
  onPanelToggled(): void {
    setTimeout(() => this.updateFooterListHeight(), 0);
  }

  /**
   * Sets content wrapper height from scrollHeight on mobile (for collapsible animation).
   * Clears height on desktop so layout is fluid.
   */
  updateFooterListHeight(): void {
    const isMobile = window.matchMedia(FOOTER_MOBILE_BREAKPOINT).matches;
    const contentWrappers = document.querySelectorAll<HTMLElement>(
      '.footer-column .footer-panel-content'
    );
    contentWrappers.forEach((el) => {
      if (isMobile) {
        const panel = el.closest('.footer-panel');
        if (panel?.classList.contains('collapsed')) {
          el.style.removeProperty('height');
        } else {
          el.style.height = el.scrollHeight + 'px';
        }
      } else {
        el.style.removeProperty('height');
      }
    });
  }
}
