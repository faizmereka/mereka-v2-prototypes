# Component Generator Agent

Generates Angular components following project patterns and best practices.

## Purpose

Create new Angular components that follow the project's coding standards:
- Standalone components (no NgModules)
- Signals for state management
- BEM + SCSS with design tokens for `@mereka/ui` components
- Tailwind CSS only for app-level one-off layouts
- OnPush change detection

## Usage

When generating a new component, follow these steps:

### 1. Component Structure

```
src/app/{feature}/
├── {component-name}.component.ts      # Component logic
├── {component-name}.component.html    # Template (if complex)
└── {component-name}.component.scss    # Styles (custom CSS, Tailwind for non-repeatable use-case)

If it's a UI component:
projects/mereka/ui/src/lib/components/{feature}/
├── ui-{component-name}.ts      # UI logic
├── ui-{component-name}.html    # Template (if complex)
└── ui-{component-name}.scss    # Styles (custom CSS)
```

### 2. Component Template

```typescript
import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-{component-name}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <!-- Template here -->
  `,
})
export class {ComponentName}Component {
  // Inputs using signal-based input()
  readonly data = input<DataType>();
  readonly disabled = input(false);

  // Outputs using output()
  readonly submitted = output<SubmitEvent>();

  // Internal state using signals
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  // Computed values
  readonly isValid = computed(() => {
    return this.data() !== undefined && !this._loading();
  });

  // Methods
  onSubmit() {
    this._loading.set(true);
    // Handle submit
    this.submitted.emit({ data: this.data() });
  }
}
```

### 3. Styling Rules

- **@mereka/ui components:** Use BEM + SCSS with CSS custom property design tokens
  - BEM Block: `ui-{name}`, Element: `ui-{name}__{element}`, Modifier: `ui-{name}--{modifier}`
  - Wrap styles in `@layer mereka-ui { ... }`
  - Use tokens: `var(--surface-*)`, `var(--content-*)`, `var(--border-*)`, `var(--space-*)`, etc.
  - Always create a separate `.component.scss` file
- **App-level components:** Tailwind CSS utility classes are acceptable for one-off, non-repeatable layouts
- **Never:** Hardcode hex/rgb values — always use CSS custom properties from the design system

### 4. File Naming

- Use kebab-case for file names: `user-profile.component.ts`
- Use PascalCase for class names: `UserProfile`
- Use camelCase for selectors: `user-profile`

### 5. Form Components

For form components, use Signal Forms:

```typescript
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  // ...
})
export class FormComponent {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });
}
```

## Validation Checklist

Before completing component generation:

- [ ] Component is standalone (no `standalone: true` needed - it's default)
- [ ] Uses `ChangeDetectionStrategy.OnPush`
- [ ] Uses `input()` and `output()` instead of decorators
- [ ] Uses signals for internal state
- [ ] Uses `computed()` for derived state
- [ ] Uses BEM + SCSS with design tokens (for @mereka/ui) or Tailwind (for app-level one-offs)
- [ ] Uses native control flow (`@if`, `@for`, `@switch`)
- [ ] Properly typed with TypeScript
