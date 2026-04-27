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
  input,
  viewChild,
  contentChild,
  TemplateRef,
  ViewEncapsulation,
  ChangeDetectorRef,
  AfterViewInit,
  inject,
  signal,
  effect,
  ElementRef,
  Renderer2,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'ui-collapse-text, [ui-collapse-text]',
  imports: [],
  templateUrl: './ui-collapse-text.html',
  styleUrl: './ui-collapse-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'ui-collapse-text',
  },
})
export class UICollapseText implements AfterViewInit {

  private readonly el = inject(ElementRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly renderer = inject(Renderer2);
  private readonly sanitizer = inject(DomSanitizer);

  contentTemplate = contentChild(TemplateRef);
  private readonly contentRef = viewChild<ElementRef<HTMLElement>>('content');

  readonly text = input<string>('');
  readonly maxLines = input<number>(3);
  readonly maxChars = input<number | null>(null);

  sanitizedHtml: SafeHtml = '';
  readonly isCollapsed = signal(true);
  readonly isCollapsible = signal(false);

  constructor() {
    effect(() => {
      this.sanitizedHtml = this.sanitizeHtml(this.text());
    });
  }


  ngAfterViewInit() {
    this.initContent();
  }

  private initContent() {
    const nativeElement = this.contentRef()?.nativeElement;
    if (!nativeElement) {
      return;
    }
    this.renderer.setProperty(nativeElement, '--max-lines', this.maxLines().toString());
    this.changeDetectorRef.detectChanges();
    this.isCollapsible.set(nativeElement.scrollHeight > nativeElement.clientHeight);
  }

  toggleCollapse() {
    const nativeElement = this.contentRef()?.nativeElement;
    if (!nativeElement) {
      return;
    }
    this.changeDetectorRef.detectChanges();
    this.isCollapsed.update((v) => !v);

    if (!this.isCollapsed()) {
      this.renderer.removeStyle(nativeElement, 'webkitLineClamp');
    } else {
      this.renderer.setProperty(nativeElement, '--max-lines', this.maxLines().toString());
    }
  }

  private sanitizeHtml(html: string): SafeHtml {
    const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return this.sanitizer.bypassSecurityTrustHtml(cleanHtml);
  }
}
