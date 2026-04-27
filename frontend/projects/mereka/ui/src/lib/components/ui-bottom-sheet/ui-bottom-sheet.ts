/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @angular-eslint/component-selector */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import {
  Component,
  viewChild,
  ElementRef,
  HostListener,
  ViewEncapsulation,
  AfterViewInit,
  input,
  inject,
  OnInit,
  PLATFORM_ID,
  output,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'ui-bottom-sheet',
  templateUrl: './ui-bottom-sheet.html',
  styleUrl: './ui-bottom-sheet.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'ui-bottom-sheet'
  },
  animations: [
    trigger('backdropFade', [
      state('void', style({
        opacity: 0
      })),
      state('expanded, partial', style({
        opacity: 1
      })),
      transition('void <=> expanded, void <=> partial', [
        animate('0.25s')
      ]),
    ])
  ]
})
export class UIBottomSheet implements OnInit, AfterViewInit {

  private readonly platformId = inject(PLATFORM_ID);

  private readonly _bottomSheetPanel = viewChild<ElementRef<HTMLElement>>('bottomSheetPanel');
  private readonly _bottomSheetContainer = viewChild<ElementRef<HTMLElement>>('bottomSheetContainer');
  private readonly _bottomSheetContent = viewChild<ElementRef<HTMLElement>>('bottomSheetContent');

  // Current state of the bottom sheet
  private _state: UIBottomSheetState = UIBottomSheetState.COLLAPSED;
  // Property to determine if bottom sheet is currently being dragged
  private _isDragging = false;
  // Touch or mouse starting Y position
  private _startY: number = 0;
  // Value between the starting mouse position and the current mouse position
  private _delta: number = 0;
  // Height unit is svh
  private _collapsedHeight: number = 0;
  private _partialHeight: number = 50;
  private _expandedHeight: number = 100;
  // The device window height in pixel unit
  private _windowHeight: number = 0;
  // The starting height when the dragging starts
  private _startHeight = 0;
  // If the bottom sheet content is scrolling
  private _isContentScrolling = false;
  // Content scroll properties. The properties are meant to enable dragging the bottom sheet
  // when the content is scrolled to the top. At the moment it is currently not implemented
  private _contentScrollIsTop: boolean = false;
  private _contentScrollPosition: number = 0;

  readonly hasBackdrop = input<boolean>(false);
  readonly enableBackdropClick = input<boolean>(true);
  readonly showHandle = input<boolean>(true);
  readonly hasRoundedCorners = input<boolean>(true);
  readonly snapDistance = input<number>(100);
  readonly collapsedOffset = input<number>(50);
  readonly expandedOffset = input<number>(0);
  readonly enablePartialView = input<boolean>(true);
  readonly enableDrag = input<boolean>(true);

  readonly expanded = output<string>();
  readonly collapsed = output<string>();
  readonly partialExpanded = output<string>();
  readonly dragStart = output<string>();
  readonly dragStop = output<string>();

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.updateWindowHeight();
    }
  }

  ngAfterViewInit() {
    //Rounded to 2 decimal places
    this._collapsedHeight = Math.round((this.collapsedOffset() / this._windowHeight) * 10000)/100;
    this._expandedHeight = Math.round(((this._windowHeight - this.expandedOffset()) / this._windowHeight) * 10000)/100;
    this._updateSheetView();
    this.checkScrollPosition();
  }

  @HostListener('window:resize', ['$event'])
  onResize(_event?: Event) {
    if (isPlatformBrowser(this.platformId)) {
      this.updateWindowHeight();
    }
  }

  private updateWindowHeight(): void {
    if (isPlatformBrowser(this.platformId)) {
      this._windowHeight = window.innerHeight;
    }
  }

  get state(): UIBottomSheetState {
    return this._state;
  }

  get isDragging(): boolean {
    return this._isDragging;
  }

  get isScrolling(): boolean {
    return this._isContentScrolling;
  }

  get contentIsTop(): boolean {
    return this._contentScrollIsTop;
  }

  get contentScrollPosition(): number {
    return this._contentScrollPosition;
  }

  /**
   * @param offset The distance from the top of the screen when in expanded state
   */
  setExpandedOffset(offset: number) {
    this._expandedHeight = Math.round(((this._windowHeight - offset) / this._windowHeight) * 10000) / 100;
    this._updateSheetView();
  }

  /**
   * @param offset The distance from the bottom of the screen when in collapsed state
   */
  setCollapsedOffset(offset: number) {
    this._collapsedHeight = Math.round((offset / this._windowHeight) * 10000) / 100;
    this._updateSheetView();
  }

  onContentScroll(event: any) {
    if (this._isDragging) {
      event.preventDefault();
      return;
    } 
    if (this.state === UIBottomSheetState.COLLAPSED) {
      event.preventDefault();
      return;
    }

    this.checkScrollPosition();        
  }

  private checkScrollPosition() {
    this._contentScrollPosition = this._bottomSheetContent()?.nativeElement.scrollTop ?? 0;

    if (this._contentScrollPosition === 0) {
      this._contentScrollIsTop = true;
    } else {
      this._contentScrollIsTop = false;
    }
  }

  /**
   * Sets the state of the bottom sheet and transition to the state.
   * @param state The state to toggle to
   */
  setState(state: UIBottomSheetState): void {
    this._state = state;
    this._updateSheetView();
  }

  /**
   * Sets the state of the bottom sheet to expanded and transition to the state.
   */
  expand(): void {
    this._state = UIBottomSheetState.PARTIAL;
    this._updateSheetView();
  }

  /**
   * Sets the state of the bottom sheet to collapsed and transition to the state.
   */
  collapse(): void {
    this._state = UIBottomSheetState.COLLAPSED;
    this._updateSheetView();
  }

  /**
   * Toggles between the collapsed and expanded states.
   */
  toggleState(): void {
    if (this._state === UIBottomSheetState.EXPANDED) {
      this._state = UIBottomSheetState.COLLAPSED;
    } else if (this._state === UIBottomSheetState.COLLAPSED) {
      this._state = UIBottomSheetState.EXPANDED;
    }
    this._updateSheetView();
  }

  onDragStart(event: MouseEvent | TouchEvent): void {
    if (!this.enableDrag()) return;
    this._isDragging = true;
    this._startY = event instanceof MouseEvent ? event.pageY : event.touches[0].pageY;
    this._startHeight = parseInt(this._bottomSheetContainer()?.nativeElement.style.height ?? '0', 10);
    this.dragStart.emit('dragStart');
  }

  onDragging(event: MouseEvent | TouchEvent): void {
    if (!this._isDragging || !this.enableDrag()) return;
    // Touch or mouse position
    const pageY = event instanceof MouseEvent ? event.pageY : event.touches[0].pageY;
    // Delta = current position - starting position
    this._delta = this._startY - pageY;
    // value is fraction of screen height
    let height = this._startHeight + this._delta / this._windowHeight * 100;
    
    // Prevent bottom sheet from being dragged out of bounds 
    if (height <= this._collapsedHeight) {
      height = this._collapsedHeight;
    } else if (height >= this._expandedHeight) {
      height = this._expandedHeight;
    }
    
    const container = this._bottomSheetContainer()?.nativeElement;
    if (container) container.style.height = `calc(${height}svh)`;
    // Prevents browser from scrolling/moving while dragging the bottom sheet
    event.preventDefault();
    event.stopPropagation();
  }

  onDragStop(): void {
    if (!this.enableDrag()) return;

    this._isDragging = false;
    const snap = this.snapDistance();
    const partial = this.enablePartialView();

    switch (this._state) {
      case UIBottomSheetState.EXPANDED:
        if (this._delta < -snap) {
          this._state = partial ? UIBottomSheetState.PARTIAL : UIBottomSheetState.COLLAPSED;
        }
        break;
      case UIBottomSheetState.PARTIAL:
        this._state = (this._delta < -snap) ? UIBottomSheetState.COLLAPSED :
                      (this._delta > snap) ? UIBottomSheetState.EXPANDED :
                      UIBottomSheetState.PARTIAL;
        break;
      case UIBottomSheetState.COLLAPSED:
        if (this._delta > snap) {
          this._state = partial ? UIBottomSheetState.PARTIAL : UIBottomSheetState.EXPANDED;
        }
        break;
    }
    this.dragStop.emit('dragStop');
    this._updateSheetView();
  }

  private _updateSheetView(): void {
    const container = this._bottomSheetContainer()?.nativeElement;
    if (!container) return;
    switch (this._state) {
      case UIBottomSheetState.COLLAPSED:
        container.style.height = `${this._collapsedHeight}svh`;
        this.collapsed.emit('collapsed');
        break;
      case UIBottomSheetState.EXPANDED:
        container.style.height = `${this._expandedHeight}svh`;
        this.expanded.emit('expanded');
        break;
      case UIBottomSheetState.PARTIAL:
        container.style.height = `${this._partialHeight}svh`;
        this.partialExpanded.emit('partial');
        break;
    }
  }
}

export enum UIBottomSheetState {
  COLLAPSED = 'collapsed',
  EXPANDED = 'expanded',
  PARTIAL = 'partial'
}