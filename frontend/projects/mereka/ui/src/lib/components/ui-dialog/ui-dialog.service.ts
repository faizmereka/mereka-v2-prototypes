import { Injectable } from '@angular/core';

@Injectable()
export class UIDialogService {

  /**
   * Determines whether 'ui-dialog-content should have a higher max-height
   * when ui-dialog-actions is not present in the dialog
   **/
  public hasActions: boolean = false;

  constructor() { }
}
