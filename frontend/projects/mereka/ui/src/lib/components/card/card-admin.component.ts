import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-card',
  template: `
    <div
      class="bg-white rounded-lg border transition-all duration-200"
      [class]="classes()"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: ``,
})
export class CardComponent {
  shadow = input<boolean>(true);
  hover = input<boolean>(false);
  padding = input<string>('p-6');

  classes() {
    const baseClasses = this.padding();
    const shadowClass = this.shadow() ? 'shadow-sm border-gray-200' : 'border-gray-100';
    const hoverClass = this.hover() ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : '';
    return `${baseClasses} ${shadowClass} ${hoverClass}`;
  }
}
