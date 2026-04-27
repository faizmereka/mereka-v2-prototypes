/**
 * Dialog configuration options
 */
export interface DialogConfig<D = unknown> {
  /** Data to pass to the dialog component */
  data?: D;
  /** Dialog width (default: 'md') */
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether clicking backdrop closes the dialog (default: true) */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes the dialog (default: true) */
  closeOnEscape?: boolean;
  /** Custom CSS class for the dialog container */
  panelClass?: string;
  /** Dialog title (optional, component can have its own) */
  title?: string;
}

/**
 * Default dialog configuration
 */
export const DEFAULT_DIALOG_CONFIG: DialogConfig = {
  width: 'md',
  closeOnBackdrop: true,
  closeOnEscape: true,
};

