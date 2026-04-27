import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface ToolbarButton {
  command: string;
  icon: string;
  title: string;
  isLink?: boolean;
}

@Component({
  selector: 'ui-rich-text-editor',
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiRichTextEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="rich-text-editor w-full">
      <!-- Editor Container -->
      <div
        class="border rounded-lg overflow-hidden transition-colors duration-200"
        [class.border-red-500]="error"
        [class.border-neutral-200]="!error && !isFocused"
        [class.border-primary]="!error && isFocused"
        [class.ring-2]="isFocused"
        [class.ring-primary]="isFocused && !error"
        [class.ring-red-500]="isFocused && error"
      >
        <!-- Editable Area -->
        <div
          #editor
          contenteditable="true"
          [attr.placeholder]="placeholder"
          class="editor-content px-4 py-3 min-h-[120px] max-h-[300px] overflow-y-auto focus:outline-none text-neutral-900"
          [class.min-h-[180px]]="minHeight === 'lg'"
          (input)="onInput($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (paste)="onPaste($event)"
          (keydown)="onKeydown($event)"
        ></div>

        <!-- Toolbar at bottom -->
        <div class="flex items-center gap-1 px-3 py-2 border-t border-neutral-200 bg-neutral-50">
          <!-- Bold -->
          <button type="button" title="Bold (Ctrl+B)" (mousedown)="$event.preventDefault()" (click)="execCommand(toolbarButtons[0])"
            class="p-2 rounded hover:bg-neutral-200 transition-colors" [class.bg-neutral-200]="isActive('bold')">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            </svg>
          </button>
          <!-- Italic -->
          <button type="button" title="Italic (Ctrl+I)" (mousedown)="$event.preventDefault()" (click)="execCommand(toolbarButtons[1])"
            class="p-2 rounded hover:bg-neutral-200 transition-colors" [class.bg-neutral-200]="isActive('italic')">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
            </svg>
          </button>
          <!-- Underline -->
          <button type="button" title="Underline (Ctrl+U)" (mousedown)="$event.preventDefault()" (click)="execCommand(toolbarButtons[2])"
            class="p-2 rounded hover:bg-neutral-200 transition-colors" [class.bg-neutral-200]="isActive('underline')">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/>
            </svg>
          </button>
          <!-- Link -->
          <button type="button" title="Insert Link" (mousedown)="$event.preventDefault()" (click)="execCommand(toolbarButtons[3])"
            class="p-2 rounded hover:bg-neutral-200 transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <!-- Ordered List -->
          <button type="button" title="Numbered List" (mousedown)="$event.preventDefault()" (click)="execCommand(toolbarButtons[4])"
            class="p-2 rounded hover:bg-neutral-200 transition-colors" [class.bg-neutral-200]="isActive('insertOrderedList')">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
              <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
            </svg>
          </button>
          <!-- Unordered List -->
          <button type="button" title="Bullet List" (mousedown)="$event.preventDefault()" (click)="execCommand(toolbarButtons[5])"
            class="p-2 rounded hover:bg-neutral-200 transition-colors" [class.bg-neutral-200]="isActive('insertUnorderedList')">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
              <circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Character Count -->
      @if (showCount && maxLength) {
        <div class="mt-1.5 text-sm" [class.text-red-500]="characterCount > maxLength" [class.text-neutral-500]="characterCount <= maxLength">
          {{ characterCount }} / {{ maxLength }}
        </div>
      }

      <!-- Error Message -->
      @if (error) {
        <p class="mt-1.5 text-sm text-red-600">{{ error }}</p>
      }
    </div>
  `,
  styles: [`
    .editor-content:empty:before {
      content: attr(placeholder);
      color: #9ca3af;
      pointer-events: none;
    }

    .editor-content p {
      margin: 0 0 0.5em 0;
    }

    .editor-content p:last-child {
      margin-bottom: 0;
    }

    .editor-content ul,
    .editor-content ol {
      margin: 0 0 0.5em 1.5em;
      padding: 0;
    }

    .editor-content li {
      margin-bottom: 0.25em;
    }

    .editor-content a {
      color: #3b82f6;
      text-decoration: underline;
    }
  `],
})
export class UiRichTextEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;

  @Input() placeholder = 'Enter text...';
  @Input() error = '';
  @Input() maxLength?: number;
  @Input() showCount = true;
  @Input() minHeight: 'default' | 'lg' = 'default';
  @Input() disabled = false;

  @Output() contentChange = new EventEmitter<string>();
  @Output() textChange = new EventEmitter<string>();

  isFocused = false;
  characterCount = 0;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private initialValue = '';

  readonly toolbarButtons: ToolbarButton[] = [
    { command: 'bold', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>', title: 'Bold (Ctrl+B)' },
    { command: 'italic', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>', title: 'Italic (Ctrl+I)' },
    { command: 'underline', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>', title: 'Underline (Ctrl+U)' },
    { command: 'createLink', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>', title: 'Insert Link', isLink: true },
    { command: 'insertOrderedList', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>', title: 'Numbered List' },
    { command: 'insertUnorderedList', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>', title: 'Bullet List' },
  ];

  ngAfterViewInit(): void {
    if (this.initialValue) {
      this.editorRef.nativeElement.innerHTML = this.initialValue;
      this.updateCharacterCount();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    if (this.editorRef?.nativeElement) {
      this.editorRef.nativeElement.innerHTML = value || '';
      this.updateCharacterCount();
    } else {
      this.initialValue = value || '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.editorRef?.nativeElement) {
      this.editorRef.nativeElement.contentEditable = (!isDisabled).toString();
    }
  }

  // Event handlers
  onInput(_event: Event): void {
    const html = this.editorRef.nativeElement.innerHTML;
    const cleanHtml = this.sanitizeHtml(html);

    this.onChange(cleanHtml);
    this.contentChange.emit(cleanHtml);
    this.textChange.emit(this.getPlainText());
    this.updateCharacterCount();
  }

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }

  onKeydown(event: KeyboardEvent): void {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          this.execCommand({ command: 'bold', icon: '', title: '' });
          break;
        case 'i':
          event.preventDefault();
          this.execCommand({ command: 'italic', icon: '', title: '' });
          break;
        case 'u':
          event.preventDefault();
          this.execCommand({ command: 'underline', icon: '', title: '' });
          break;
      }
    }
  }

  // Toolbar actions
  execCommand(btn: ToolbarButton): void {
    if (btn.isLink) {
      const url = prompt('Enter URL:', 'https://');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    } else {
      document.execCommand(btn.command, false);
    }
    this.editorRef.nativeElement.focus();
    this.onInput(new Event('input'));
  }

  isActive(command: string): boolean {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  // Helpers
  private updateCharacterCount(): void {
    this.characterCount = this.getPlainText().length;
  }

  getPlainText(): string {
    const html = this.editorRef?.nativeElement?.innerHTML || '';
    // Convert <br> and block elements to spaces for character counting
    const text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    return text;
  }

  getHtml(): string {
    return this.editorRef?.nativeElement?.innerHTML || '';
  }

  private sanitizeHtml(html: string): string {
    // Basic sanitization - remove script tags and event handlers
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '');
  }

  // Public method to set content programmatically
  setContent(html: string): void {
    if (this.editorRef?.nativeElement) {
      this.editorRef.nativeElement.innerHTML = html;
      this.updateCharacterCount();
      this.onChange(html);
    }
  }

  // Public method to clear content
  clear(): void {
    this.setContent('');
  }
}
