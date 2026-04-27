/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
  inject,
  input,
  output,
  computed,
  signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { UICard, UICardBody, UICardImage, UICardRow, UICardTitle } from '../ui-card';
import { UIGalleryLightbox, UIGalleryLightboxData, UIGalleryLightboxViewMode } from '@mereka/ui/ui-gallery/ui-gallery-lightbox';
import { UIImage } from '@mereka/ui/ui-image/ui-image';

// Optional: use string if @angular/fire is not installed
type TimestampLike = string | { toDate?: () => Date } | undefined;

const REVIEW_LAYOUTS = ['', 'compact', 'extended'];

@Component({
  selector: 'ui-card-review, [ui-card-review]',
  templateUrl: './ui-card-review.html',
  styleUrl: './ui-card-review.scss',
  exportAs: 'uiCardReview',
  host: {
    'class': 'ui-card-review',
    '[id]': 'id() ? "item-"+id() : null',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIcon,
    UIImage,
    UICardImage,
    UICardTitle,
    UICardRow,
    UICardBody,
  ],
})
export class UICardReview extends UICard implements OnInit {

  private readonly _dialog = inject(MatDialog);

  readonly id = input<string>('');
  readonly image = input<string>('');
  readonly title = input<string>('');
  readonly date = input<string>('');
  readonly rating = input<number>(0);
  readonly review = input<string>('');
  readonly photos = input<string[]>([]);
  readonly showPhotos = input<boolean>(true);
  readonly replyTitle = input<string>('Your response');
  readonly replyMessage = input<string>('');
  readonly serviceTitle = input<string>('');
  readonly submittedDate = input<TimestampLike>('');
  readonly closedDate = input<TimestampLike>('');
  readonly serviceType = input<string>('');
  readonly showReplyButton = input<boolean>(false);
  readonly clampReview = input<boolean>(false);
  readonly collapseReview = input<boolean>(false);
  readonly reviewMaxLength = input<number>(250);
  readonly hideElements = input<string[]>([]);

  readonly reply = output<object>();
  readonly openGallery = output<object>();

  readonly showReview = signal(false);
  readonly showResponse = signal(false);
  readonly filteredPhotos = signal<string[]>([]);

  readonly effectiveLayout = computed(() => {
    const v = this.layout();
    return REVIEW_LAYOUTS.includes(v) ? v : '';
  });

  readonly effectiveShowPhotos = computed(() =>
    this.effectiveLayout() === 'compact' ? false : this.showPhotos()
  );

  ngOnInit(): void {
    const p = this.photos()?.filter(Boolean) ?? [];
    this.filteredPhotos.set(p);
  }

  openGalleryLightbox(index: number) {
    const data: UIGalleryLightboxData = {
      images: this.filteredPhotos(),
      selectedIndex: index,
      viewMode: UIGalleryLightboxViewMode.SLIDER,
    };
    const ref = this._dialog.open(UIGalleryLightbox, {
      width: '',
      height: '',
      maxWidth: '',
      maxHeight: '',
      backdropClass: ['ui-lightbox-overlay-backdrop'],
      panelClass: ['ui-lightbox-overlay-pane'],
      data,
    });
    ref.removePanelClass('mat-mdc-dialog-panel');
  }

  replyReview() {
    const reviewObj = {
      userName: this.title(),
      profileUrl: this.image(),
      createdDate: this.date(),
      rating: this.rating(),
      reviewDescription: this.review(),
      photos: this.filteredPhotos(),
      $key: this.id(),
    };
    this.reply.emit({ review: reviewObj });
  }

  toggleReview($event: Event) {
    $event.stopPropagation();
    this.showReview.update((v) => !v);
  }

  toggleResponse($event: Event) {
    $event.stopPropagation();
    this.showResponse.update((v) => !v);
  }
}
