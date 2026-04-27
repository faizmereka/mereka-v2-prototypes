import { Component, input, output, signal, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * ChatInput - Message input with file attachment and upload progress
 *
 * @covers AC-FEC-030 through AC-FEC-040
 */
@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-input.component.html',
  styles: [`:host { display: block; flex-shrink: 0; }`],
})
export class ChatInputComponent {
  // @covers AC-FEC-040
  readonly disabled = input(false);
  readonly placeholder = input('Type a message...');
  readonly sending = input(false);

  // Upload progress (0-100)
  readonly uploadProgress = input(0);
  readonly uploading = input(false);

  // Computed: show progress bar when uploading
  readonly showProgress = computed(() => this.uploading() && this.uploadProgress() > 0);

  // @covers AC-FEC-038
  readonly sendMessage = output<{ text: string; files?: File[] }>();
  // @covers AC-FEC-039
  readonly typing = output<boolean>();

  @ViewChild('textarea') textarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly messageText = signal('');
  // @covers AC-FEC-037
  readonly selectedFiles = signal<File[]>([]);

  private typingTimeout?: ReturnType<typeof setTimeout>;
  private isTyping = false;

  // @covers AC-FEC-031 - Auto-resize textarea
  onInput(): void {
    this.autoResize();
    this.emitTyping(true);

    // Debounce typing stop
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.emitTyping(false);
    }, 3000);
  }

  // @covers AC-FEC-034 - Enter to send, Shift+Enter for new line
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  // @covers AC-FEC-038
  onSend(): void {
    const text = this.messageText().trim();
    const files = this.selectedFiles();

    if (!text && files.length === 0) return;
    if (this.disabled() || this.sending()) return;

    this.sendMessage.emit({
      text,
      files: files.length > 0 ? files : undefined,
    });

    // Reset
    this.messageText.set('');
    this.selectedFiles.set([]);
    this.emitTyping(false);
    this.resetTextareaHeight();
  }

  // @covers AC-FEC-035, AC-FEC-036
  onFileButtonClick(): void {
    this.fileInput?.nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const newFiles = Array.from(input.files);
      this.selectedFiles.update((existing) => [...existing, ...newFiles]);
    }
    // Reset input so the same file can be selected again
    input.value = '';
  }

  removeFile(index: number): void {
    this.selectedFiles.update((files) => files.filter((_, i) => i !== index));
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getFileIcon(file: File): string {
    const type = file.type;
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'pdf';
    if (type.includes('document') || type.includes('word')) return 'doc';
    if (type.includes('spreadsheet') || type.includes('excel')) return 'sheet';
    return 'file';
  }

  private emitTyping(isTyping: boolean): void {
    if (this.isTyping !== isTyping) {
      this.isTyping = isTyping;
      this.typing.emit(isTyping);
    }
  }

  private autoResize(): void {
    if (this.textarea) {
      const element = this.textarea.nativeElement;
      element.style.height = 'auto';
      // Max height for 5 lines (approx)
      const maxHeight = 120;
      element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
    }
  }

  private resetTextareaHeight(): void {
    if (this.textarea) {
      this.textarea.nativeElement.style.height = 'auto';
    }
  }
}
