import { formatDate } from "@angular/common";
import { MatDateFormats, NativeDateAdapter } from "@angular/material/core";

export class UIDateAdapter extends NativeDateAdapter {
  override format(date: Date): string {
    return formatDate(date, 'dd/MM/yyyy', 'en-AU');
  }
}
export const UI_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};