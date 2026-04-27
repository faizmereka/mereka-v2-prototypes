import { Component, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-toggle',
  imports: [CommonModule],
  template: `
    <label class="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        [checked]="checked()"
        (change)="onChange($event)"
        class="sr-only peer"
        [attr.aria-checked]="checked()"
      />
      <div
        class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"
      ></div>
    </label>
  `,
  styles: ``,
})
export class UiToggleComponent {
  checked = input<boolean>(false);
  checkedChange = output<boolean>();

  onChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checkedChange.emit(target.checked);
  }
}

