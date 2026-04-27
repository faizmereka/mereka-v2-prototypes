import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateAdapter, MatDateFormats, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatCalendar } from '@angular/material/datepicker';
import { MatIcon } from '@angular/material/icon';
import { UIButton } from '@mereka/ui/ui-button/ui-button';

/** Custom header component for datepicker. */
@Component({
  selector: 'ui-datepicker-header',
  imports: [UIButton, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .ui-datepicker-header {
      display: flex;
      align-items: center;
      padding: 0.5em;
    }
    .ui-datepicker-header-label {
      flex: 1;
      height: 1em;
      font-weight: 700;
      text-align: center;
    }
    .example-double-arrow .mat-icon {
      margin: -22%;
    }
  `],
  template: `
    <div class="ui-datepicker-header">
      <button ui-button-icon-outline [disabled]="!previousEnabled()" (click)="previousClicked()">
        <span ui-button-icon-wrapper>
          <mat-icon fontIcon="chevron_left"/>
        </span>
      </button>
      <span class="ui-datepicker-header-label">{{ periodLabel }}</span>
      <button ui-button-icon-outline [disabled]="!nextEnabled()" (click)="nextClicked()">
        <span ui-button-icon-wrapper>
          <mat-icon fontIcon="chevron_right"/>
        </span>
      </button>
    </div>
  `,
})
export class UIDatePickerHeaderComponent<D> implements OnDestroy {

  private readonly _calendar = inject(MatCalendar<D>);
  private readonly _dateAdapter = inject(DateAdapter<D>);
  private readonly _dateFormats = inject<MatDateFormats>(MAT_DATE_FORMATS);
  private readonly _changeDetectorRef = inject(ChangeDetectorRef);
  private readonly _destroyRef = inject(DestroyRef);

  constructor() {
    this._calendar.stateChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._changeDetectorRef.markForCheck());
  }

  ngOnDestroy() {}
  
    get periodLabel() {
      return this._dateAdapter
        .format(this._calendar.activeDate, this._dateFormats.display.monthYearLabel);
    }
  
    previousClicked() {
      this._calendar.activeDate = this._dateAdapter.addCalendarMonths(this._calendar.activeDate, -1)
    }
  
    nextClicked() {
      this._calendar.activeDate = this._dateAdapter.addCalendarMonths(this._calendar.activeDate, 1)
    }
  
    /** Whether the previous period button is enabled. */
    previousEnabled(): boolean {
      if (!this._calendar.minDate) {
        return true;
      }
      return (
        !this._calendar.minDate || !this._isSameView(this._calendar.activeDate, this._calendar.minDate)
      );
    }
  
    /** Whether the next period button is enabled. */
    nextEnabled(): boolean {
      return (
        !this._calendar.maxDate || !this._isSameView(this._calendar.activeDate, this._calendar.maxDate)
      );
    }
  
    /** Whether the two dates represent the same view in the current view mode (month or year). */
    private _isSameView(date1: D, date2: D): boolean | undefined {
      if (this._calendar.currentView == 'month') {
        return (
          this._dateAdapter.getYear(date1) == this._dateAdapter.getYear(date2) &&
          this._dateAdapter.getMonth(date1) == this._dateAdapter.getMonth(date2)
        );
      }
      if (this._calendar.currentView == 'year') {
        return this._dateAdapter.getYear(date1) == this._dateAdapter.getYear(date2);
      }
      return;
    }
  }
  