import { Injectable, inject, signal, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationStart } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { API_BASE_URL } from '../tokens/api-url.token';
import type { SearchResultItem, SearchApiResponse } from '../models/search.model';

@Injectable({
  providedIn: 'root',
})
export class SearchService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private readonly searchInputSubject = new Subject<string>();
  private readonly subscriptions: Subscription[] = [];

  readonly searchTerm = signal<string>('');
  readonly searchResults = signal<SearchResultItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly noMatches = signal<boolean>(false);
  readonly panelExpanded = signal<boolean>(false);

  constructor() {
    this.initSearch();
    this.initRouterListener();
  }

  private initSearch(): void {
    const sub = this.searchInputSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchValue) => {
        this.searchTerm.set(searchValue);

        if (searchValue.length >= 3) {
          this.performSearch(searchValue);
        } else {
          this.resetResults();
        }
      });

    this.subscriptions.push(sub);
  }

  private initRouterListener(): void {
    const sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (isPlatformBrowser(this.platformId)) {
          window.scrollTo(0, 0);
        }
        this.close();
      }
    });

    this.subscriptions.push(sub);
  }

  private performSearch(query: string): void {
    this.searchResults.set([]);
    this.isLoading.set(true);
    this.noMatches.set(false);

    const apiUrl = `${this.apiBaseUrl}/search?q=${encodeURIComponent(query)}&limit=10`;

    this.http.get<SearchApiResponse>(apiUrl).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data?.results) {
          this.searchResults.set(response.data.results);
          this.noMatches.set(response.data.results.length === 0);
        } else {
          this.noMatches.set(true);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.noMatches.set(true);
      },
    });
  }

  updateSearchTerm(value: string): void {
    this.searchInputSubject.next(value);
  }

  open(): void {
    if (!this.panelExpanded()) {
      this.panelExpanded.set(true);
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = 'hidden';
      }
    }
  }

  close(): void {
    if (this.panelExpanded()) {
      this.panelExpanded.set(false);
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = '';
      }
    }
  }

  toggle(): void {
    if (this.panelExpanded()) {
      this.close();
    } else {
      this.open();
    }
  }

  private resetResults(): void {
    this.searchResults.set([]);
    this.isLoading.set(false);
    this.noMatches.set(false);
  }

  resetSearch(): void {
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.isLoading.set(false);
    this.noMatches.set(false);
  }

  getRoute(item: SearchResultItem): string {
    switch (item.type) {
      case 'hubs':
        return `/hubs/${item.slug || item.id}`;
      case 'experts':
        return `/experts/${item.slug || item.id}`;
      case 'expertise':
        return `/expertise/${item.slug || item.id}`;
      case 'experiences':
        return `/experiences/${item.slug || item.id}`;
      case 'jobs':
        return `/jobs/${item.id}`;
      default:
        return '/';
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
