import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  HostListener,
  Injector,
  Type,
  ViewContainerRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DialogConfig, DEFAULT_DIALOG_CONFIG } from './dialog-config';
import { DialogRef } from './dialog-ref';
import { DIALOG_DATA, DIALOG_CONFIG } from './dialog-tokens';

/**
 * Internal dialog container component.
 * This component is created by DialogService to host the actual dialog content.
 */
@Component({
  selector: 'app-dialog-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <!-- Overlay -->
      <div
        class="fixed inset-0 bg-black/50 transition-opacity"
        (click)="onBackdropClick()"
      ></div>

      <!-- Dialog Container -->
      <div class="flex min-h-full items-center justify-center p-4">
        <!-- Dialog Content -->
        <div
          class="relative w-full bg-white rounded-lg shadow-xl transform transition-all animate-scale-in"
          [class]="widthClass()"
          [class.custom-panel]="config()?.panelClass"
          (click)="$event.stopPropagation()"
        >
          <!-- Dynamic component will be inserted here -->
          <ng-container #dialogContent></ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scale-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.15s ease-out;
    }

    .animate-scale-in {
      animation: scale-in 0.2s ease-out;
    }
  `],
})
export class DialogContainerComponent {
  private readonly viewContainerRef = viewChild('dialogContent', { read: ViewContainerRef });
  private readonly parentInjector = inject(Injector);

  private componentRef: ComponentRef<unknown> | null = null;
  private dialogRef: DialogRef | null = null;

  readonly config = signal<DialogConfig | null>(null);

  readonly widthClass = computed(() => {
    const width = this.config()?.width || 'md';
    const widthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-4xl',
    };
    return widthClasses[width];
  });

  constructor() {
    // Lock body scroll when dialog is open
    effect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    const cfg = this.config();
    if (cfg?.closeOnEscape !== false) {
      this.close();
    }
  }

  onBackdropClick(): void {
    const cfg = this.config();
    if (cfg?.closeOnBackdrop !== false) {
      this.close();
    }
  }

  /**
   * Attach a component to this dialog container
   */
  attachComponent<T, D, R>(
    component: Type<T>,
    config: DialogConfig<D>,
    dialogRef: DialogRef<R>
  ): ComponentRef<T> {
    this.config.set({ ...DEFAULT_DIALOG_CONFIG, ...config });
    this.dialogRef = dialogRef as DialogRef;

    const vcr = this.viewContainerRef();
    if (!vcr) {
      throw new Error('ViewContainerRef not available');
    }

    // Create custom injector with dialog-specific tokens
    const injector = Injector.create({
      parent: this.parentInjector,
      providers: [
        { provide: DialogRef, useValue: dialogRef },
        { provide: DIALOG_DATA, useValue: config.data },
        { provide: DIALOG_CONFIG, useValue: config },
      ],
    });

    // Create and insert the component
    this.componentRef = vcr.createComponent(component, { injector });
    return this.componentRef as ComponentRef<T>;
  }

  /**
   * Close the dialog
   */
  close(): void {
    this.dialogRef?.close();
  }

  /**
   * Clean up when dialog is destroyed
   */
  destroy(): void {
    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = null;
    }
    document.body.style.overflow = '';
  }
}

