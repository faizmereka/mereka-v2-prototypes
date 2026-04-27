# Page Generator Agent

Generates Angular page components with routing following project patterns.

## Purpose

Create new page components that integrate with the admin layout:
- Lazy-loaded routes
- Proper layout integration
- Data loading patterns
- Error handling

## Page Structure

```
src/app/pages/{page-name}/
├── {page-name}.component.ts       # Main page component
├── {page-name}.component.html     # Template
├── components/                    # Page-specific components
│   ├── {page-name}-list.component.ts
│   └── {page-name}-form.component.ts
└── services/                      # Page-specific services (optional)
    └── {page-name}.service.ts
```

## Page Component Template

```typescript
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-{page-name}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-6">
      <!-- Page Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold">{PageTitle}</h1>
          <p class="text-neutral-500">Manage {page-name}</p>
        </div>
        <button
          class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          (click)="onCreate()"
        >
          Add New
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="p-4 bg-error/10 border border-error rounded-md text-error mb-6">
          {{ error() }}
        </div>
      }

      <!-- Content -->
      @if (!loading() && !error()) {
        <!-- Data table or list here -->
        <div class="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <!-- Table content -->
        </div>
      }
    </div>
  `,
})
export class {PageName}Component implements OnInit {
  private readonly service = inject({PageName}Service);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = this.service.items;

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.getAll().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to load data');
      },
    });
  }

  onCreate(): void {
    // Navigate to create page or open modal
  }
}
```

## Route Configuration

Add to `app.routes.ts`:

```typescript
{
  path: '{page-name}',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./pages/{page-name}/{page-name}.component').then(
      (m) => m.{PageName}Component,
    ),
},
```

## Sidebar Link

Add to `sidebar.component.html`:

```html
<a
  routerLink="/{page-name}"
  routerLinkActive="bg-primary text-white"
  class="flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-neutral-100 transition-colors"
>
  <svg class="w-5 h-5"><!-- Icon --></svg>
  <span>{Page Title}</span>
</a>
```

## Common Page Features

### Data Table

```html
<table class="w-full">
  <thead class="bg-neutral-50">
    <tr>
      <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-600">Name</th>
      <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-600">Status</th>
      <th class="px-4 py-3 text-right text-sm font-semibold text-neutral-600">Actions</th>
    </tr>
  </thead>
  <tbody class="divide-y divide-neutral-200">
    @for (item of items(); track item.id) {
      <tr class="hover:bg-neutral-50">
        <td class="px-4 py-3 text-sm">{{ item.name }}</td>
        <td class="px-4 py-3 text-sm">
          <span
            class="px-2 py-1 text-xs rounded-full"
            [class]="item.status === 'active' ? 'bg-success/10 text-success' : 'bg-neutral-100 text-neutral-600'"
          >
            {{ item.status }}
          </span>
        </td>
        <td class="px-4 py-3 text-sm text-right">
          <button class="text-primary hover:underline">Edit</button>
        </td>
      </tr>
    }
  </tbody>
</table>
```

### Pagination

```html
<div class="flex justify-between items-center px-4 py-3 border-t border-neutral-200">
  <p class="text-sm text-neutral-500">
    Showing {{ startIndex() + 1 }} to {{ endIndex() }} of {{ total() }} results
  </p>
  <div class="flex gap-2">
    <button
      class="px-3 py-1 border border-neutral-300 rounded-md disabled:opacity-50"
      [disabled]="page() === 1"
      (click)="previousPage()"
    >
      Previous
    </button>
    <button
      class="px-3 py-1 border border-neutral-300 rounded-md disabled:opacity-50"
      [disabled]="page() >= totalPages()"
      (click)="nextPage()"
    >
      Next
    </button>
  </div>
</div>
```

## Validation Checklist

- [ ] Page is lazy-loaded in routes
- [ ] Uses authGuard for protection
- [ ] Loading and error states handled
- [ ] Uses Tailwind CSS for styling
- [ ] OnPush change detection
- [ ] Proper TypeScript types
