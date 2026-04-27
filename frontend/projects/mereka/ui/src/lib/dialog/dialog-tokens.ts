import { InjectionToken } from '@angular/core';
import type { DialogConfig } from './dialog-config';

/**
 * Injection token for dialog data
 * Use this to inject data passed via dialogService.open()
 *
 * @example
 * ```typescript
 * export class MyDialogComponent {
 *   private data = inject(DIALOG_DATA);
 * }
 * ```
 */
export const DIALOG_DATA = new InjectionToken<unknown>('DIALOG_DATA');

/**
 * Injection token for dialog configuration
 */
export const DIALOG_CONFIG = new InjectionToken<DialogConfig>('DIALOG_CONFIG');

