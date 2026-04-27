import { Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

type ImageShape = 'square' | 'rounded' | 'circle';
type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'ui-image',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (src() && !imageError) {
      <img
        [src]="src()"
        [alt]="alt()"
        [ngClass]="[sizeClasses(), shapeClasses()]"
        class="object-cover bg-gray-100"
        (error)="onImageError()"
      />
    } @else {
      <div
        [ngClass]="[sizeClasses(), shapeClasses(), gradientClasses()]"
        class="flex items-center justify-center font-semibold text-white"
      >
        <span [ngClass]="textSizeClasses()">{{ initials() }}</span>
      </div>
    }
  `,
})
export class ImageComponent {
  /** Image source URL */
  src = input<string | null | undefined>();

  /** Alt text for the image */
  alt = input<string>('');

  /** Fallback name for initials (used when image fails to load) */
  fallbackName = input<string>('');

  /** Shape of the image */
  shape = input<ImageShape>('rounded');

  /** Size of the image */
  size = input<ImageSize>('md');

  /** Track if image failed to load */
  imageError = false;

  /** Generate initials from name */
  initials = computed(() => {
    const name = this.fallbackName() || this.alt() || '';
    if (!name) return '?';

    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  });

  /** Size classes */
  sizeClasses = computed(() => {
    const sizes: Record<ImageSize, string> = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
      full: 'w-full aspect-video',
    };
    return sizes[this.size()];
  });

  /** Text size classes based on image size */
  textSizeClasses = computed(() => {
    const sizes: Record<ImageSize, string> = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-2xl',
      full: 'text-4xl',
    };
    return sizes[this.size()];
  });

  /** Shape classes */
  shapeClasses = computed(() => {
    const shapes: Record<ImageShape, string> = {
      square: 'rounded-none',
      rounded: 'rounded-lg',
      circle: 'rounded-full',
    };
    return shapes[this.shape()];
  });

  /** Generate consistent gradient based on name */
  gradientClasses = computed(() => {
    const gradients = [
      'bg-gradient-to-br from-blue-500 to-purple-600',
      'bg-gradient-to-br from-green-500 to-teal-600',
      'bg-gradient-to-br from-purple-500 to-pink-600',
      'bg-gradient-to-br from-orange-500 to-red-600',
      'bg-gradient-to-br from-indigo-500 to-blue-600',
      'bg-gradient-to-br from-teal-500 to-cyan-600',
      'bg-gradient-to-br from-pink-500 to-rose-600',
      'bg-gradient-to-br from-cyan-500 to-blue-600',
      'bg-gradient-to-br from-rose-500 to-orange-600',
      'bg-gradient-to-br from-violet-500 to-purple-600',
    ];
    const name = this.fallbackName() || this.alt() || '';
    if (!name) return gradients[0];

    // Generate consistent index from name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  });

  onImageError() {
    this.imageError = true;
  }
}
