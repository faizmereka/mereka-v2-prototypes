import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ChatInputComponent } from './chat-input.component';

/**
 * Test Suite for ChatInputComponent
 * @spec specs/messaging/messaging-fe-components_spec.md
 * @covers AC-FEC-030 through AC-FEC-040
 */

describe('ChatInputComponent', () => {
  let component: ChatInputComponent;
  let fixture: ComponentFixture<ChatInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ==========================================================================
  // Component Creation
  // ==========================================================================

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ==========================================================================
  // AC-FEC-030: Input defaults
  // ==========================================================================

  describe('AC-FEC-030: Default State', () => {
    it('should have default placeholder', () => {
      expect(component.placeholder()).toBe('Type a message...');
    });

    it('should not be disabled by default', () => {
      expect(component.disabled()).toBe(false);
    });

    it('should not be sending by default', () => {
      expect(component.sending()).toBe(false);
    });

    it('should have empty message text', () => {
      expect(component.messageText()).toBe('');
    });

    it('should have no selected files', () => {
      expect(component.selectedFiles()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // AC-FEC-034: Enter to send
  // ==========================================================================

  describe('AC-FEC-034: Enter Key Behavior', () => {
    it('should send on Enter key', () => {
      const sendSpy = vi.spyOn(component.sendMessage, 'emit');
      component.messageText.set('Hello');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalled();
    });

    it('should not send on Shift+Enter', () => {
      const sendSpy = vi.spyOn(component.sendMessage, 'emit');
      component.messageText.set('Hello');

      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });

      component.onKeydown(event);

      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AC-FEC-038: Send message
  // ==========================================================================

  describe('AC-FEC-038: Send Message', () => {
    it('should emit sendMessage with text', () => {
      const sendSpy = vi.spyOn(component.sendMessage, 'emit');
      component.messageText.set('Hello world');

      component.onSend();

      expect(sendSpy).toHaveBeenCalledWith({
        text: 'Hello world',
        files: undefined,
      });
    });

    it('should not send empty message', () => {
      const sendSpy = vi.spyOn(component.sendMessage, 'emit');
      component.messageText.set('   ');

      component.onSend();

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should not send when disabled', () => {
      const sendSpy = vi.spyOn(component.sendMessage, 'emit');
      component.messageText.set('Hello');
      fixture.componentRef.setInput('disabled', true);

      component.onSend();

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should not send when already sending', () => {
      const sendSpy = vi.spyOn(component.sendMessage, 'emit');
      component.messageText.set('Hello');
      fixture.componentRef.setInput('sending', true);

      component.onSend();

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should clear message after send', () => {
      component.messageText.set('Hello');
      component.onSend();

      expect(component.messageText()).toBe('');
    });
  });

  // ==========================================================================
  // AC-FEC-037: File attachments
  // ==========================================================================

  describe('AC-FEC-037: File Attachments', () => {
    it('should add files to selectedFiles', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = { target: { files: [file], value: '' } } as unknown as Event;

      component.onFilesSelected(event);

      expect(component.selectedFiles()).toHaveLength(1);
      expect(component.selectedFiles()[0].name).toBe('test.txt');
    });

    it('should remove file by index', () => {
      const file1 = new File([''], 'file1.txt');
      const file2 = new File([''], 'file2.txt');
      component.selectedFiles.set([file1, file2]);

      component.removeFile(0);

      expect(component.selectedFiles()).toHaveLength(1);
      expect(component.selectedFiles()[0].name).toBe('file2.txt');
    });

    it('should send message with files', () => {
      const sendSpy = vi.spyOn(component.sendMessage, 'emit');
      const file = new File([''], 'test.txt');
      component.messageText.set('With attachment');
      component.selectedFiles.set([file]);

      component.onSend();

      expect(sendSpy).toHaveBeenCalledWith({
        text: 'With attachment',
        files: [file],
      });
    });

    it('should clear files after send', () => {
      const file = new File([''], 'test.txt');
      component.messageText.set('Test');
      component.selectedFiles.set([file]);

      component.onSend();

      expect(component.selectedFiles()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // AC-FEC-039: Typing indicator
  // ==========================================================================

  describe('AC-FEC-039: Typing Indicator', () => {
    it('should emit typing true on input', () => {
      const typingSpy = vi.spyOn(component.typing, 'emit');

      component.onInput();

      expect(typingSpy).toHaveBeenCalledWith(true);
    });

    it('should emit typing false after timeout', async () => {
      vi.useFakeTimers();
      const typingSpy = vi.spyOn(component.typing, 'emit');

      component.onInput();
      expect(typingSpy).toHaveBeenCalledWith(true);

      vi.advanceTimersByTime(3000);

      expect(typingSpy).toHaveBeenCalledWith(false);
      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // Utility methods
  // ==========================================================================

  describe('Utility Methods', () => {
    it('should format file size in bytes', () => {
      expect(component.formatFileSize(500)).toBe('500 B');
    });

    it('should format file size in KB', () => {
      expect(component.formatFileSize(1500)).toBe('1.5 KB');
    });

    it('should format file size in MB', () => {
      expect(component.formatFileSize(1500000)).toBe('1.4 MB');
    });

    it('should return correct file icon for image', () => {
      const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });
      expect(component.getFileIcon(file)).toBe('image');
    });

    it('should return correct file icon for PDF', () => {
      const file = new File([''], 'doc.pdf', { type: 'application/pdf' });
      expect(component.getFileIcon(file)).toBe('pdf');
    });

    it('should return correct file icon for Word doc', () => {
      const file = new File([''], 'doc.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      expect(component.getFileIcon(file)).toBe('doc');
    });

    it('should return generic file icon for unknown type', () => {
      const file = new File([''], 'data.bin', { type: 'application/octet-stream' });
      expect(component.getFileIcon(file)).toBe('file');
    });
  });
});
