# Mereka Frontend Workspace - Claude AI Instructions

---

## Workspace & Project Identity

| Key | Value |
|-----|-------|
| **Project ID** | `mereka-frontend-v2` |
| **Version** | v2 (Angular 21+ Monorepo) |
| **Production** | `mereka-production` |
| **Staging** | `mereka-web-17` |
| **Development** | `mereka-dev` |

### Related Projects (v2 Workspace)

| Project | Path | CLAUDE.md |
|---------|------|-----------|
| **Frontend v2** | `.` (this project) | This file |
| **Backend v2** | `../mereka-backend-v2-elevate-ref` | [CLAUDE.md](../mereka-backend-v2-elevate-ref/CLAUDE.md) |

### Legacy Projects (v1 - Firebase)

| Project | Path | Description |
|---------|------|-------------|
| **mereka-web** | `../mereka-web` | v1 Frontend (Angular + Firebase) |
| **mereka-web-17** | `../mereka-web-17` | v1 Frontend Staging |
| **mereka-cloudfunctions** | `../mereka-cloudfunctions` | v1 Backend (Firebase Cloud Functions) |

**VS Code Workspace**: `../mereka-backend-v2-elevate-ref/mereka-backend-v2-elevate-ref.code-workspace`

### Cross-Project Development

When working on features that span frontend and backend:
1. **Frontend changes needed from Backend context**: Reference this CLAUDE.md for Angular patterns
2. **Backend changes needed from Frontend context**: Reference `../mereka-backend-v2-elevate-ref/CLAUDE.md`
3. Both projects share the same Firebase project (`mereka-dev` for dev, `mereka-production` for prod)

### v1 vs v2 (Important!)

| Aspect | v1 (Legacy) | v2 (Current) |
|--------|-------------|--------------|
| Frontend | `mereka-web`, `mereka-web-17` | `mereka-frontend-workspace` (Angular 21+ Monorepo) |
| Backend | Firebase Functions (`mereka-cloudfunctions`) | Node.js + Fastify + MongoDB |
| Database | Firestore | MongoDB |
| Auth | Firebase Auth | Firebase Auth (shared) |
| Storage | Firebase Storage | Firebase Storage (shared) |

**v2 is the active development stack. v1 is deprecated.**

---

## MCP Tools (Preferred)

### Fast Apply - Primary File Edit Tool

Use `edit_file` over `str_replace` or full file writes.

This tool handles:
- Automatic indentation correction
- Fuzzy matching for code blocks
- Faster execution than alternatives

→ Prefer this over manual file editing tools.
→ Works with partial code snippets—no need for full file content.

### Fast Context - Primary Code Search Tool

Use `warpgrep_codebase_search` FIRST instead of manually running search commands.

This tool runs parallel grep and readfile calls to locate relevant files and line ranges. Ideal for:
- "Find where authentication is handled"
- "Locate the payment processing logic"
- "Find the bug where users get redirected incorrectly"

Pass a targeted natural language query describing what you're trying to accomplish. Add inferred context when helpful.

→ Always start your search here.
→ Use classical search tools afterward if needed to fill gaps.
→ Cannot be called in parallel - one invocation at a time.

---

## Expertise & Tech Stack

**Expert in:** TypeScript, Angular 21+, RxJS, Tailwind CSS, Standalone Components, Signals

**Key Skills:**
- Angular monorepo architecture with shared libraries
- Signal-based reactive state management
- Tailwind CSS utility-first styling (NO Bootstrap/CSS frameworks)
- Component-driven development with proper separation of concerns
- Type-safe API integration with proper interfaces

---

## Project Context

**Angular 21+ monorepo workspace** serving multiple frontend apps with shared libraries.

| App | Domain | Port | Purpose |
|-----|--------|------|---------|
| auth | auth.mereka.io | 4201 | Authentication flows |
| web | mereka.io | 4200 | Public website |
| app | app.mereka.io | 4202 | Main authenticated app |
| admin | admin.mereka.io | 4204 | Super admin dashboard |

---

## Quick Commands

```bash
# Serve specific app
ng serve admin --port 4204
ng serve auth --port 4201
ng serve app --port 4202

# Build library
ng build @mereka/ui

# Build for production
ng build admin --configuration=production

# Generate component (follows proper folder structure)
ng g c component-name --project=@mereka/ui --path=projects/mereka/ui/src/lib/components

# Test
ng test admin
```

---

## Complete Project Structure

```
mereka-frontend-workspace/
├── projects/
│   ├── app/                        # app.mereka.io (main authenticated app)
│   │   └── src/app/
│   │       ├── core/
│   │       │   └── layouts/
│   │       │       ├── main-layout/
│   │       │       └── checkout-layout/
│   │       ├── shared/
│   │       │   └── components/
│   │       │       ├── navbar/
│   │       │       ├── footer/
│   │       │       └── ...
│   │       ├── features/
│   │       │   ├── hub-dashboard/      # Hub owner dashboard
│   │       │   │   ├── hub-dashboard.component.ts
│   │       │   │   ├── hub-dashboard.component.html
│   │       │   │   ├── hub-dashboard.routes.ts
│   │       │   │   ├── pages/
│   │       │   │   │   ├── overview/
│   │       │   │   │   ├── services/
│   │       │   │   │   ├── bookings/
│   │       │   │   │   ├── members/
│   │       │   │   │   ├── finances/
│   │       │   │   │   ├── analytics/
│   │       │   │   │   └── settings/
│   │       │   │   ├── components/
│   │       │   │   └── dialogs/
│   │       │   │
│   │       │   ├── user-dashboard/     # User (learner/expert) dashboard
│   │       │   │   ├── user-dashboard.component.ts
│   │       │   │   ├── user-dashboard.component.html
│   │       │   │   ├── user-dashboard.routes.ts
│   │       │   │   ├── pages/
│   │       │   │   │   ├── overview/
│   │       │   │   │   ├── bookings/
│   │       │   │   │   ├── transactions/
│   │       │   │   │   ├── reviews/
│   │       │   │   │   ├── courses/
│   │       │   │   │   ├── billing/
│   │       │   │   │   ├── notifications/
│   │       │   │   │   └── settings/
│   │       │   │   ├── components/
│   │       │   │   └── dialogs/
│   │       │   │
│   │       │   ├── onboarding/         # User onboarding flows
│   │       │   │   ├── learner/
│   │       │   │   ├── expert/
│   │       │   │   └── hub/
│   │       │   │
│   │       │   ├── experience/         # Experience features
│   │       │   └── expertise/          # Expertise features
│   │       │
│   │       ├── app.routes.ts
│   │       └── app.config.ts
│   │
│   ├── admin/                      # admin.mereka.io
│   │   └── src/app/
│   │       ├── core/
│   │       ├── shared/
│   │       ├── pages/
│   │       └── layout/
│   │
│   ├── auth/                       # auth.mereka.io
│   │   └── src/app/
│   │       └── features/
│   │           ├── login/
│   │           ├── register/
│   │           └── forgot-password/
│   │
│   ├── web/                        # mereka.io (public)
│   │   └── src/app/
│   │
│   ├── checkout/                   # checkout.mereka.io
│   │   └── src/app/
│   │
│   └── mereka/                     # Shared libraries
│       ├── ui/                     # @mereka/ui - UI Components
│       │   └── src/lib/components/
│       │       ├── panel/
│       │       ├── form-page/
│       │       └── ... (one folder per component)
│       │
│       ├── core/                   # @mereka/core - Services
│       │   └── src/lib/
│       │       ├── services/
│       │       ├── guards/
│       │       └── interceptors/
│       │
│       └── models/                 # @mereka/models - Interfaces
│           └── src/lib/
│
├── tailwind.config.js
├── angular.json
└── tsconfig.json
```

---

## Angular 19+ Modern Features (MUST USE)

### Signal-Based APIs (REQUIRED)

```typescript
// ✅ CORRECT - Modern Angular 19+
import { input, output, model, computed, signal } from '@angular/core';

@Component({...})
export class MyComponent {
  // Inputs - use input() function
  readonly name = input<string>();
  readonly count = input.required<number>();
  readonly items = input<Item[]>([]);

  // Two-way binding - use model()
  readonly value = model<string>('');

  // Outputs - use output() function
  readonly clicked = output<MouseEvent>();

  // Internal state - use signal()
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  // Derived state - use computed()
  readonly isValid = computed(() => this.name() !== '' && !this._loading());
}

// ❌ WRONG - Old decorator style (DO NOT USE)
@Input() name: string;
@Output() clicked = new EventEmitter();
```

### Separate Files for Components (MANDATORY)

**ALWAYS use separate files** for HTML, TS, and SCSS:

```typescript
// ✅ CORRECT - Separate files
@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  imports: [CommonModule, RouterLink],
})
export class UsersComponent {}

// ❌ WRONG - Inline template (DO NOT USE)
@Component({
  template: `<div>...</div>`,
  styles: [`...`],
})
```

### Standalone Components (MANDATORY)

ALL components MUST be standalone (default in Angular 19+):

```typescript
// ✅ CORRECT - Angular 19+
@Component({
  selector: 'app-example',
  imports: [CommonModule, RouterLink],
  templateUrl: './example.component.html',
})
export class ExampleComponent {}

// ❌ NEVER use standalone: false
```

### Lazy Loading Routes (MANDATORY)

```typescript
export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
  },
];

// ❌ WRONG - Direct component import
{ path: 'users', component: UsersComponent }
```

### Native Control Flow (MANDATORY)

```html
<!-- ✅ CORRECT - Native control flow -->
@if (loading()) {
  <div class="animate-spin">Loading...</div>
} @else {
  @for (item of items(); track item.id) {
    <div>{{ item.name }}</div>
  } @empty {
    <p>No items found</p>
  }
}

@switch (status()) {
  @case ('pending') { <span>Pending</span> }
  @case ('approved') { <span>Approved</span> }
}

<!-- ❌ WRONG - Old structural directives -->
<div *ngIf="loading">...</div>
<div *ngFor="let item of items">...</div>
```

---

## Styling with Tailwind CSS (STRICT)

- **ALWAYS use Tailwind utility classes** in templates
- **NEVER use CSS custom properties** like `var(--color-*)`
- **Minimal SCSS** - only for animations or third-party overrides

### Theme Colors
```
primary: #1a1623
neutral: 50-900
success: #22c55e
warning: #f59e0b
error: #ef4444
info: #3b82f6
```

### Common Patterns
```html
<!-- Card -->
<div class="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">

<!-- Button Primary -->
<button class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">

<!-- Input -->
<input class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary">

<!-- Table -->
<table class="w-full">
  <thead class="bg-neutral-50 border-b border-neutral-200">
    <th class="px-4 py-3 text-left text-sm font-semibold">Name</th>
  </thead>
</table>
```

---

## Service Template

```typescript
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  private readonly _users = signal<User[]>([]);
  private readonly _loading = signal(false);

  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();

  getAll() {
    this._loading.set(true);
    return this.http.get<{ data: User[] }>(this.apiUrl).pipe(
      tap(res => {
        this._users.set(res.data);
        this._loading.set(false);
      }),
    );
  }
}
```

---

## What NOT to Do

```typescript
// ❌ DO NOT use decorators
@Input() data: any;
@Output() clicked = new EventEmitter();

// ❌ DO NOT use any type
const data: any = response;

// ❌ DO NOT use constructor injection
constructor(private http: HttpClient) {}

// ❌ DO NOT use inline templates/styles
template: `<div>...</div>`

// ❌ DO NOT use structural directives
<div *ngIf="loading">

// ❌ DO NOT use ngClass/ngStyle
[ngClass]="{'active': isActive}"

// ❌ DO NOT use BehaviorSubject (use signals)
private loading$ = new BehaviorSubject(false);
```

---

## Quick Reference

| Old Way | New Way (Angular 19+) |
|---------|----------------------|
| `@Input()` | `input()`, `input.required()` |
| `@Output()` | `output()` |
| `*ngIf` | `@if` |
| `*ngFor` | `@for` |
| `*ngSwitch` | `@switch` |
| `BehaviorSubject` | `signal()` |
| `constructor(private x)` | `inject(X)` |
| Direct route component | `loadComponent: () => import(...)` |
| `template: \`...\`` | `templateUrl: './x.html'` |

---

## Shared Libraries

| Library | Import | Purpose |
|---------|--------|---------|
| `@mereka/ui` | `import { UiPanelComponent } from '@mereka/ui';` | Shared UI components |
| `@mereka/core` | `import { ApiService } from '@mereka/core';` | API, Auth, HTTP interceptors |
| `@mereka/models` | `import { User } from '@mereka/models';` | TypeScript interfaces |

---

## @mereka/ui Component Structure (MANDATORY)

### Folder Structure - One Component Per Folder

Each UI component MUST have its own folder (following Angular CLI `ng g c` conventions):

```
projects/mereka/ui/src/lib/components/
├── panel/                          # Each component in its own folder
│   ├── panel.component.ts
│   ├── panel.component.html
│   └── index.ts
├── panel-header/                   # Separate folder for related component
│   ├── panel-header.component.ts
│   ├── panel-header.component.html
│   └── index.ts
├── panel-row/
│   ├── panel-row.component.ts
│   ├── panel-row.component.html
│   └── index.ts
├── form-page/
│   ├── form-page.component.ts
│   ├── form-page.component.html
│   └── index.ts
├── form-page-header/
│   ├── form-page-header.component.ts
│   ├── form-page-header.component.html
│   └── index.ts
└── index.ts                        # Main barrel export
```

### Creating Components (Use Angular CLI)

```bash
# Generate new UI component
ng g c panel --project=@mereka/ui --path=projects/mereka/ui/src/lib/components

# This creates:
# panel/
# ├── panel.component.ts
# ├── panel.component.html
# ├── panel.component.scss (optional)
# └── panel.component.spec.ts (optional)
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component folder | kebab-case | `panel/`, `form-page/` |
| Component file | kebab-case.component.ts | `panel.component.ts` |
| HTML template | kebab-case.component.html | `panel.component.html` |
| Component class | Ui + PascalCase + Component | `UiPanelComponent` |
| Selector | ui-kebab-case | `ui-panel`, `ui-form-page` |

### Component Template

```typescript
// panel/panel.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel.component.html',  // ALWAYS use templateUrl
})
export class UiPanelComponent {
  @Input() containerClass = '';
}
```

```html
<!-- panel/panel.component.html -->
<div class="bg-white rounded-xl border border-gray-200 overflow-hidden" [class]="containerClass">
  <ng-content></ng-content>
</div>
```

### Index.ts Barrel Export Pattern

```typescript
// Each folder has its own index.ts
// panel/index.ts
export * from './panel.component';

// Main components/index.ts exports all folders
export * from './panel';
export * from './panel-header';
export * from './panel-row';
export * from './form-page';
export * from './form-page-header';
export * from './chip';
export * from './chip-input';
// ... etc
```

### Available UI Components

| Component | Selector | Purpose |
|-----------|----------|---------|
| UiPanelComponent | `ui-panel` | Container with border/shadow |
| UiPanelHeaderComponent | `ui-panel-header` | Panel header with actions |
| UiPanelRowComponent | `ui-panel-row` | Panel row content |
| UiPanelSidebarComponent | `ui-panel-sidebar` | Sidebar within panel row |
| UiFormPageComponent | `ui-form-page` | Full-page form layout |
| UiFormPageHeaderComponent | `ui-form-page-header` | Form header |
| UiFormPageBodyComponent | `ui-form-page-body` | Form content area |
| UiFormPageFooterComponent | `ui-form-page-footer` | Form actions footer |
| UiFormSectionComponent | `ui-form-section` | Form section with title |
| UiFormGroupComponent | `ui-form-group` | Form field group |
| UiFormLabelComponent | `ui-form-label` | Form field label |
| UiFormHintComponent | `ui-form-hint` | Hint text below field |
| UiFormErrorComponent | `ui-form-error` | Error message |
| UiFormOptionalComponent | `ui-form-optional` | Optional label |
| UiFormRequiredComponent | `ui-form-required` | Required asterisk |
| UiCharacterCountComponent | `ui-character-count` | Character counter |
| UiCheckboxTileComponent | `ui-checkbox-tile` | Tile-style checkbox |
| UiTileGridComponent | `ui-tile-grid` | Grid container for tiles |
| UiRadioGroupComponent | `ui-radio-group` | Radio button group |
| UiRadioButtonComponent | `ui-radio-button` | Radio button option |
| UiRadioCardComponent | `ui-radio-card` | Card-style radio option |
| UiChipComponent | `ui-chip` | Tag/chip display |
| UiChipInputComponent | `ui-chip-input` | Input for adding chips |
| UiUploadImageComponent | `ui-upload-image` | Image upload with preview |
| UiUploadFileComponent | `ui-upload-file` | Generic file upload |

---

## App Feature Folder Structure

Each feature in the app should follow this structure:

```
features/
├── hub-dashboard/                  # Hub owner dashboard
│   ├── hub-dashboard.component.ts  # Shell with sidebar + router-outlet
│   ├── hub-dashboard.component.html
│   ├── hub-dashboard.routes.ts     # Child routes (lazy loaded)
│   ├── pages/                      # Each page is a route
│   │   ├── overview/
│   │   │   ├── overview.component.ts
│   │   │   ├── overview.component.html
│   │   │   └── index.ts
│   │   ├── services/
│   │   ├── bookings/
│   │   ├── members/
│   │   ├── finances/
│   │   ├── analytics/
│   │   └── settings/
│   ├── components/                 # Shared within this feature
│   │   ├── stats-card/
│   │   ├── sidebar-menu/
│   │   └── booking-card/
│   ├── dialogs/                    # Modal dialogs
│   └── index.ts
│
├── user-dashboard/                 # User (learner/expert) dashboard
│   ├── user-dashboard.component.ts
│   ├── user-dashboard.component.html
│   ├── user-dashboard.routes.ts
│   ├── pages/
│   │   ├── overview/
│   │   ├── bookings/
│   │   ├── transactions/
│   │   ├── reviews/
│   │   ├── courses/
│   │   ├── billing/
│   │   ├── notifications/
│   │   └── settings/
│   ├── components/
│   ├── dialogs/
│   └── index.ts
```

### Dashboard Routes Pattern

```typescript
// hub-dashboard.routes.ts
export const HUB_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./hub-dashboard.component')
      .then(m => m.HubDashboardComponent),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () => import('./pages/overview/overview.component')
          .then(m => m.HubOverviewComponent),
      },
      {
        path: 'services',
        loadComponent: () => import('./pages/services/services.component')
          .then(m => m.HubServicesComponent),
      },
      // ... more child routes
    ],
  },
];

// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/user-dashboard/user-dashboard.routes')
      .then(m => m.USER_DASHBOARD_ROUTES),
  },
  {
    path: 'hub',
    loadChildren: () => import('./features/hub-dashboard/hub-dashboard.routes')
      .then(m => m.HUB_DASHBOARD_ROUTES),
  },
];
```

### Feature Component Template

```typescript
// features/dashboard/dashboard.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiPanelComponent, UiPanelHeaderComponent } from '@mereka/ui';
import { DashboardService } from './services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, UiPanelComponent, UiPanelHeaderComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  ngOnInit() {
    // Initialize
  }
}
```

### Feature Routes (Lazy Loading)

```typescript
// features/dashboard/dashboard.routes.ts
import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard.component').then(m => m.DashboardComponent),
  },
];

// app.routes.ts
export const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
  },
];
```

---

## Backend API

Backend: `/Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-backend-v2-elevate-ref`

### API Response Format
```typescript
// Success
{ success: true, data: {...}, meta: {...} }

// Error
{ success: false, error: { code: 'ERROR_CODE', message: '...' } }
```

---

## File Naming Summary

| Type | Convention | Example |
|------|------------|---------|
| Component folder | kebab-case | `user-profile/` |
| Component file | kebab-case.component.ts | `user-profile.component.ts` |
| Service file | kebab-case.service.ts | `user.service.ts` |
| Guard file | kebab-case.guard.ts | `auth.guard.ts` |
| Interface file | kebab-case.model.ts | `user.model.ts` |
| Routes file | kebab-case.routes.ts | `dashboard.routes.ts` |
| Barrel export | index.ts | `index.ts` |

---

_Last updated: 2025-12-09 | Angular 21+_
