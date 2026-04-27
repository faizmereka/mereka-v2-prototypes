import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-placeholder',
    template: `
    <div class="placeholder-page animate-fade-in">
      <div class="placeholder-content panel">
        <div class="panel-body">
          <div class="placeholder-icon">
            <img src="icons/icon-suggestion-bold.svg" alt="Coming Soon" />
          </div>
          <h2 class="placeholder-title">{{ title }}</h2>
          <p class="placeholder-text">
            This page is under construction. Check back soon!
          </p>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .placeholder-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - var(--header-height) - var(--content-padding) * 2);
    }

    .placeholder-content {
      text-align: center;
      max-width: 400px;
    }

    .placeholder-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      margin: 0 auto var(--space-5);
      background-color: var(--color-gray-100);
      border-radius: var(--border-radius-full);

      img {
        width: 40px;
        height: 40px;
      }
    }

    .placeholder-title {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-black);
      margin-bottom: var(--space-3);
    }

    .placeholder-text {
      color: var(--color-gray-500);
    }
  `]
})
export class PlaceholderComponent {
    private route = inject(ActivatedRoute);
    title = this.route.snapshot.data['title'] || 'Page';
}

