import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-access-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isHeader) {
      <div class="access-row-header grid grid-cols-5 gap-4 py-3 border-b border-neutral-200 text-sm font-medium text-neutral-500">
        <div>{{ title }}</div>
        @for (col of columns; track col) {
          <div class="text-center">{{ col }}</div>
        }
      </div>
    } @else {
      <div class="access-row grid grid-cols-5 gap-4 py-3 border-b border-neutral-100 items-center">
        <div class="text-neutral-700">{{ title }}</div>
        <div class="flex justify-center">
          @if (permission1) {
            <input
              type="checkbox"
              [checked]="hasPermission(permission1)"
              [disabled]="!isEditing"
              (change)="toggle(permission1)"
              class="w-5 h-5 rounded border-neutral-300 text-primary focus:ring-primary disabled:opacity-50"
            />
          }
        </div>
        <div class="flex justify-center">
          @if (permission2) {
            <input
              type="checkbox"
              [checked]="hasPermission(permission2)"
              [disabled]="!isEditing"
              (change)="toggle(permission2)"
              class="w-5 h-5 rounded border-neutral-300 text-primary focus:ring-primary disabled:opacity-50"
            />
          }
        </div>
        <div class="flex justify-center">
          @if (permission3) {
            <input
              type="checkbox"
              [checked]="hasPermission(permission3)"
              [disabled]="!isEditing"
              (change)="toggle(permission3)"
              class="w-5 h-5 rounded border-neutral-300 text-primary focus:ring-primary disabled:opacity-50"
            />
          }
        </div>
        <div class="flex justify-center">
          @if (permission4) {
            <input
              type="checkbox"
              [checked]="hasPermission(permission4)"
              [disabled]="!isEditing"
              (change)="toggle(permission4)"
              class="w-5 h-5 rounded border-neutral-300 text-primary focus:ring-primary disabled:opacity-50"
            />
          }
        </div>
      </div>
    }
  `,
})
export class AccessRowComponent {
  @Input() title = '';
  @Input() isHeader = false;
  @Input() columns: string[] = ['Add', 'View', 'Edit', 'Delete'];
  @Input() permissions: string[] = [];
  @Input() isEditing = false;

  // Permission keys for each column
  @Input() permission1?: string;
  @Input() permission2?: string;
  @Input() permission3?: string;
  @Input() permission4?: string;

  @Output() permissionToggled = new EventEmitter<string>();

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  toggle(permission: string): void {
    this.permissionToggled.emit(permission);
  }
}
