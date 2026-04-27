/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
export const UI_DIALOG_CONFIG = {
  maxWidth: '',
  width: '',
  minHeight: '',
  height: '',
  panelClass: ['ui-dialog-overlay-pane', 'ui-dialog-overlay-pane--mobile-fullscreen'],
  backdropClass: 'ui-dialog-overlay-backdrop',
  disableClose: false,
};

export class UIDialogConfig {
  
  static getBaseConfig(): object {
    return { ...UI_DIALOG_CONFIG };
  }
  /**
   * Configure dialog properties.
   * Future enhancements: to add more properties to the config object
   * How to use:
   * 
   * 
    // This sets up the standard config for the dialog

    this.matDialog
    .open(YourDialogComponent, {
      ...UIDialogConfig.getBaseConfig(), 
      data: { 
        // Your dialog data here
      }
    })

    // Configures the dialog to a small width
    this.matDialog
    .open(YourDialogComponent, {
        ...UIDialogConfig.setConfig({ width: 'small'}),
      data: { 
        // Your dialog data here
      }
    }) 

    See properties UIDialogConfigData for more details
   **/
  static setConfig(data: UIDialogConfigData): object {
    const config = { ...UI_DIALOG_CONFIG };
    const panelClass: string[] = ['ui-dialog-overlay-pane'];

    if (data.width) {
      if (typeof data.width === 'number') {
        config.width = `${data.width}px`;
      } else {
        switch (data.width) {
          case 'large':
            panelClass.push('ui-dialog-overlay-pane--large');
            break;
          case 'auto':
            panelClass.push('ui-dialog-overlay-pane--auto');
            break;
          case 'small':
            panelClass.push('ui-dialog-overlay-pane--small');
            break;
          default:
            panelClass.push('ui-dialog-overlay-pane--small');
            break;
        } 
      }    
    }
    if (data.layout) {
      switch (data.layout) {
        case 'column':
          panelClass.push('ui-dialog-overlay-pane--column');
          break;
      }
    }
    if (data.mobileView === 'window') {
      config.disableClose = true;
    } else if (data.mobileView === 'fullscreen' || data.mobileView === undefined) {      
      panelClass.push('ui-dialog-overlay-pane--mobile-fullscreen');
    }
    config.panelClass = panelClass;
    return config;
  }
  /**
   * Configure dialog width. Deprecated.
   **/
  static getConfigSetWidth(width: 'large' | 'small' | 'auto' | number): object {
    return this.setConfig({width: width});
  }
}

export interface UIDialogConfigData {
  // Dialog width. large = 1080px, small = 420px, auto = auto
  // If auto, the width is determined by the width of the content or a fixed width ui-dialog-container 
  width?: 'large' | 'small' | 'auto' | number;
  // Unused at the moment
  height?: 'large' | 'small' | 'auto' | number;
  // Column layout allows multiple ui-dialog-container to stack horizontally (such as the login dialog)
  layout?: 'column';
  // Determines the dialog size in mobile screens
  mobileView?: 'fullscreen' | 'window'; 
}