import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  computed,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ViewBreakpointService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _screenWidth = signal(0);

  readonly screenWidth = this._screenWidth.asReadonly();

  readonly isDesktop = computed(() => this._screenWidth() >= 1200);
  readonly isLaptop = computed(() => this._screenWidth() >= 1024 && this._screenWidth() < 1200);
  readonly isLaptopMax = computed(() => this._screenWidth() < 1200);
  readonly isLaptopMin = computed(() => this._screenWidth() >= 1024);
  readonly isTablet = computed(() => this._screenWidth() >= 768 && this._screenWidth() < 1024);
  readonly isTabletMax = computed(() => this._screenWidth() < 1024);
  readonly isTabletMin = computed(() => this._screenWidth() >= 768);
  readonly isMobile = computed(() => this._screenWidth() < 768);
  readonly isMobileMax = computed(() => this._screenWidth() < 768);
  readonly isMobileMin = computed(() => this._screenWidth() >= 768);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const updateWidth = () =>
        this._screenWidth.set(this.document.body?.offsetWidth ?? 0);
      fromEvent(window, 'resize')
        .pipe(
          debounceTime(50),
          startWith(null),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(updateWidth);
    }
  }

  getDevice(): string {
    const w = this._screenWidth();
    if (w < 576) return 'mobile';
    if (w >= 768 && w < 1200) return 'tablet';
    return 'desktop';
  }
}

export enum SCREEN_SIZE {
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
  XXL = 'xxl',
}
