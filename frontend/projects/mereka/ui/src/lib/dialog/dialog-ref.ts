import { Subject, Observable } from 'rxjs';

/**
 * Reference to an opened dialog.
 * Use this to close the dialog and get the result.
 *
 * @example
 * ```typescript
 * // In caller component
 * const dialogRef = this.dialogService.open(MyDialog, { data: myData });
 * dialogRef.afterClosed().subscribe(result => {
 *   if (result) {
 *     console.log('Dialog returned:', result);
 *   }
 * });
 *
 * // In dialog component
 * export class MyDialogComponent {
 *   private dialogRef = inject(DialogRef);
 *
 *   save() {
 *     this.dialogRef.close({ success: true, data: this.formData });
 *   }
 *
 *   cancel() {
 *     this.dialogRef.close();
 *   }
 * }
 * ```
 */
export class DialogRef<R = unknown> {
  private readonly _afterClosed = new Subject<R | undefined>();
  private _result: R | undefined;

  /**
   * Observable that emits when the dialog is closed
   */
  afterClosed(): Observable<R | undefined> {
    return this._afterClosed.asObservable();
  }

  /**
   * Close the dialog with an optional result
   */
  close(result?: R): void {
    this._result = result;
    this._afterClosed.next(result);
    this._afterClosed.complete();
  }

  /**
   * Get the result (if dialog was closed with a result)
   */
  get result(): R | undefined {
    return this._result;
  }
}

