# Service Generator Agent

Generates Angular services following project patterns and best practices.

## Purpose

Create new Angular services that follow the project's coding standards:
- Injectable with `providedIn: 'root'`
- Use `inject()` function instead of constructor injection
- Use signals for reactive state
- Proper error handling

## Service Template

```typescript
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface {Entity} {
  id: string;
  // ... entity fields
}

export interface {Entity}ListResponse {
  success: boolean;
  data: {Entity}[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class {Entity}Service {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/{entities}`;

  // State signals
  private readonly _items = signal<{Entity}[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed values
  readonly isEmpty = computed(() => this._items().length === 0);
  readonly count = computed(() => this._items().length);

  /**
   * Fetch all items
   */
  getAll(params?: { page?: number; limit?: number }): Observable<{Entity}ListResponse> {
    this._loading.set(true);
    this._error.set(null);

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));

    const url = queryParams.toString()
      ? `${this.apiUrl}?${queryParams.toString()}`
      : this.apiUrl;

    return this.http.get<{Entity}ListResponse>(url).pipe(
      tap((response) => {
        if (response.success) {
          this._items.set(response.data);
        }
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        this._error.set(error.error?.message || 'Failed to fetch items');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get single item by ID
   */
  getById(id: string): Observable<{ success: boolean; data: {Entity} }> {
    return this.http.get<{ success: boolean; data: {Entity} }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new item
   */
  create(data: Partial<{Entity}>): Observable<{ success: boolean; data: {Entity} }> {
    return this.http.post<{ success: boolean; data: {Entity} }>(this.apiUrl, data).pipe(
      tap((response) => {
        if (response.success) {
          this._items.update((items) => [...items, response.data]);
        }
      }),
    );
  }

  /**
   * Update existing item
   */
  update(id: string, data: Partial<{Entity}>): Observable<{ success: boolean; data: {Entity} }> {
    return this.http.patch<{ success: boolean; data: {Entity} }>(`${this.apiUrl}/${id}`, data).pipe(
      tap((response) => {
        if (response.success) {
          this._items.update((items) =>
            items.map((item) => (item.id === id ? response.data : item)),
          );
        }
      }),
    );
  }

  /**
   * Delete item
   */
  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`).pipe(
      tap((response) => {
        if (response.success) {
          this._items.update((items) => items.filter((item) => item.id !== id));
        }
      }),
    );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Reset state
   */
  reset(): void {
    this._items.set([]);
    this._loading.set(false);
    this._error.set(null);
  }
}
```

## File Naming

- Use kebab-case for file names: `user-profile.service.ts`
- Use PascalCase for class names: `UserProfileService`
- Place in `src/app/core/services/` for shared services
- Place in feature folder for feature-specific services

## Validation Checklist

Before completing service generation:

- [ ] Uses `providedIn: 'root'` for singleton services
- [ ] Uses `inject()` instead of constructor injection
- [ ] Uses signals for reactive state
- [ ] Proper error handling with catchError
- [ ] Returns Observables from HTTP methods
- [ ] Properly typed with TypeScript interfaces
- [ ] Updates local state after successful mutations
