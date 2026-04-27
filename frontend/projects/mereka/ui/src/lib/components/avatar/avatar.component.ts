import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'ui-avatar',
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses">
      @if (hasValidImage) {
        <img
          [src]="src"
          [alt]="alt"
          class="w-full h-full object-cover"
          (error)="onImageError()"
        />
      } @else {
        <span [class]="initialsClasses">{{ initials }}</span>
      }

      <!-- Online Status Indicator -->
      @if (showStatus) {
        <span [class]="statusClasses"></span>
      }
    </div>
  `,
})
export class UiAvatarComponent {
  @Input() src = '';
  @Input() alt = 'Avatar';
  @Input() name = '';
  @Input() size: AvatarSize = 'md';
  @Input() showStatus = false;
  @Input() online = false;

  imageError = false;

  get hasValidImage(): boolean {
    return !this.imageError && !!this.src && this.src.trim().length > 0;
  }

  get initials(): string {
    if (!this.name) return '?';
    const parts = this.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  get containerClasses(): string {
    const sizes: Record<AvatarSize, string> = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
    };
    return `relative inline-flex items-center justify-center rounded-full bg-gray-200 overflow-hidden ${sizes[this.size]}`;
  }

  get initialsClasses(): string {
    const sizes: Record<AvatarSize, string> = {
      xs: 'text-xs',
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    };
    return `font-medium text-gray-600 ${sizes[this.size]}`;
  }

  get statusClasses(): string {
    const sizes: Record<AvatarSize, string> = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
    };
    const color = this.online ? 'bg-green-500' : 'bg-gray-400';
    return `absolute bottom-0 right-0 rounded-full ring-2 ring-white ${sizes[this.size]} ${color}`;
  }

  onImageError(): void {
    this.imageError = true;
    this.src = '';
  }
}
