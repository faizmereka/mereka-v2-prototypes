import { Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
    selector: 'ui-avatar',
    imports: [NgClass],
    template: `
    @if (imageUrl() && !imageError) {
      <img
        [src]="imageUrl()"
        [alt]="name()"
        [ngClass]="sizeClasses()"
        class="rounded-full object-cover bg-gray-100"
        (error)="onImageError()"
      />
    } @else {
      <div
        [ngClass]="[sizeClasses(), bgColor()]"
        class="rounded-full flex items-center justify-center font-semibold text-white"
      >
        {{ initials() }}
      </div>
    }
  `,
})
export class AvatarComponent {
    /** Image URL - if not provided or fails to load, shows initials */
    imageUrl = input<string | null | undefined>();

    /** Name to generate initials from */
    name = input<string>('');

    /** Size variant */
    size = input<AvatarSize>('md');

    /** Track if image failed to load */
    imageError = false;

    /** Generate initials from name */
    initials = computed(() => {
        const nameValue = this.name();
        if (!nameValue) return '?';

        const parts = nameValue.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    });

    /** Size classes */
    sizeClasses = computed(() => {
        const sizes: Record<AvatarSize, string> = {
            xs: 'w-6 h-6 text-xs',
            sm: 'w-8 h-8 text-sm',
            md: 'w-10 h-10 text-base',
            lg: 'w-12 h-12 text-lg',
            xl: 'w-16 h-16 text-xl',
        };
        return sizes[this.size()];
    });

    /** Generate consistent background color based on name */
    bgColor = computed(() => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-indigo-500',
            'bg-teal-500',
            'bg-orange-500',
            'bg-cyan-500',
            'bg-rose-500',
            'bg-violet-500',
        ];
        const nameValue = this.name();
        if (!nameValue) return colors[0];

        // Generate consistent index from name
        let hash = 0;
        for (let i = 0;i < nameValue.length;i++) {
            hash = nameValue.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    });

    onImageError() {
        this.imageError = true;
    }
}

