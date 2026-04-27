import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UiChipComponent } from '../chip';

@Component({
  selector: 'ui-chip-input',
  imports: [CommonModule, FormsModule, UiChipComponent],
  templateUrl: './chip-input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiChipInputComponent),
      multi: true,
    },
  ],
})
export class UiChipInputComponent implements ControlValueAccessor {
  @Input() placeholder = 'Type and press Enter';
  @Input() maxChips = 0;
  @Input() maxChipLength = 50;
  @Input() chipVariant: 'primary' | 'default' | 'success' = 'primary';
  @Input() disabled = false;
  @Input() chips: string[] = [];
  @Output() chipsChange = new EventEmitter<string[]>();
  inputValue = '';

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string[]): void {
    this.chips = value || [];
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  addChip(event: Event) {
    event.preventDefault();
    this.addChipFromButton();
  }

  addChipFromButton() {
    const value = this.inputValue.trim().replace(/,/g, '');
    if (value && !this.chips.includes(value)) {
      if (this.maxChips === 0 || this.chips.length < this.maxChips) {
        this.chips = [...this.chips, value];
        this.inputValue = '';
        this.emitChange();
      }
    }
  }

  removeChip(chip: string) {
    this.chips = this.chips.filter((c) => c !== chip);
    this.emitChange();
  }

  private emitChange() {
    this.chipsChange.emit(this.chips);
    this.onChange(this.chips);
    this.onTouched();
  }
}
