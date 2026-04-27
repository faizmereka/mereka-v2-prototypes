import {
    ApplicationRef,
    ComponentRef,
    Injectable,
    Injector,
    Type,
    createComponent,
    inject,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DialogConfig, DEFAULT_DIALOG_CONFIG } from './dialog-config';
import { DialogRef } from './dialog-ref';
import { DialogContainerComponent } from './dialog-container.component';
import { DialogConfirmComponent, ConfirmDialogData } from './confirm-dialog.component';

/**
 * Dialog Service
 *
 * Opens components as modal dialogs with data passing and result handling.
 *
 * @example
 * ```typescript
 * // Open a dialog
 * const dialogRef = this.dialogService.open(MyDialogComponent, {
 *   data: { item: existingItem, mode: 'edit' },
 *   width: 'lg',
 * });
 *
 * // Handle result
 * dialogRef.afterClosed().subscribe(result => {
 *   if (result) {
 *     console.log('Dialog returned:', result);
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // In the dialog component
 * export class MyDialogComponent {
 *   private dialogRef = inject(DialogRef);
 *   private data = inject(DIALOG_DATA);
 *
 *   save() {
 *     this.dialogRef.close({ saved: true, data: this.form.value });
 *   }
 * }
 * ```
 */
@Injectable({
    providedIn: 'root',
})
export class DialogService {
    private readonly appRef = inject(ApplicationRef);
    private readonly injector = inject(Injector);

    // Track open dialogs (use any for internal tracking to avoid variance issues)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private openDialogs: Array<{
        containerRef: ComponentRef<DialogContainerComponent>;
        dialogRef: DialogRef<any>;
    }> = [];

    /**
     * Open a component as a dialog
     *
     * @param component The component to display in the dialog
     * @param config Dialog configuration (data, width, etc.)
     * @returns DialogRef to control the dialog and get results
     */
    open<T, D = unknown, R = unknown>(
        component: Type<T>,
        config: DialogConfig<D> = {}
    ): DialogRef<R> {
        const mergedConfig = { ...DEFAULT_DIALOG_CONFIG, ...config };
        const dialogRef = new DialogRef<R>();

        // Create the container component
        const containerRef = createComponent(DialogContainerComponent, {
            environmentInjector: this.appRef.injector,
            elementInjector: this.injector,
        });

        // Attach to the DOM
        document.body.appendChild(containerRef.location.nativeElement);
        this.appRef.attachView(containerRef.hostView);

        // Attach the content component to the container
        containerRef.instance.attachComponent(component, mergedConfig, dialogRef);

        // Track this dialog
        this.openDialogs.push({ containerRef, dialogRef: dialogRef as DialogRef<any> });

        // Clean up when dialog closes
        dialogRef.afterClosed().subscribe(() => {
            this.closeDialog(containerRef);
        });

        return dialogRef;
    }

    /**
     * Close all open dialogs
     */
    closeAll(): void {
        [...this.openDialogs].forEach(({ dialogRef }) => {
            dialogRef.close();
        });
    }

    /**
     * Get the number of open dialogs
     */
    get openDialogCount(): number {
        return this.openDialogs.length;
    }

    /**
     * Open a confirmation dialog
     *
     * @param config Confirmation dialog configuration
     * @returns Promise that resolves to true if confirmed, false if cancelled
     *
     * @example
     * ```typescript
     * const confirmed = await this.dialogService.confirm({
     *   title: 'Delete Item',
     *   message: 'Are you sure you want to delete this item?',
     *   type: 'danger',
     *   confirmText: 'Delete',
     * });
     *
     * if (confirmed) {
     *   await this.deleteItem();
     * }
     * ```
     */
    async confirm(config: ConfirmDialogData): Promise<boolean> {
        const dialogRef = this.open<DialogConfirmComponent, ConfirmDialogData, boolean>(
            DialogConfirmComponent,
            {
                data: config,
                width: 'sm',
                closeOnBackdrop: false,
            }
        );

        const result = await firstValueFrom(dialogRef.afterClosed());
        return result === true;
    }

    /**
     * Internal: Close and clean up a specific dialog
     */
    private closeDialog(containerRef: ComponentRef<DialogContainerComponent>): void {
        // Remove from tracking
        this.openDialogs = this.openDialogs.filter(
            (d) => d.containerRef !== containerRef
        );

        // Clean up container
        containerRef.instance.destroy();
        this.appRef.detachView(containerRef.hostView);
        containerRef.destroy();
    }
}

