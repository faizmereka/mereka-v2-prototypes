import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTask,
} from 'firebase/storage';
import { environment } from '../../../environments/environment';
import type { ChatFile } from '@mereka/models';

/**
 * Upload progress state for a single file
 */
export interface FileUploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

/**
 * Chat Upload Service - Handles file uploads to Firebase Storage for chat
 *
 * Features:
 * - Upload multiple files with progress tracking
 * - Generates download URLs for backend
 * - Image thumbnail generation (future)
 */
@Injectable({ providedIn: 'root' })
export class ChatUploadService {
  private storage;

  // Reactive state
  readonly uploading = signal(false);
  readonly totalProgress = signal(0); // 0-100 overall progress
  readonly fileProgresses = signal<FileUploadProgress[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    // Initialize Firebase if not already initialized
    const app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
    this.storage = getStorage(app);
  }

  /**
   * Upload files to Firebase Storage and return ChatFile array
   *
   * @param files - Files to upload
   * @param roomId - Chat room ID for storage path organization
   * @returns Array of ChatFile objects with URLs ready for backend
   */
  async uploadChatFiles(files: File[], roomId: string): Promise<ChatFile[]> {
    if (files.length === 0) return [];

    this.uploading.set(true);
    this.error.set(null);
    this.totalProgress.set(0);

    // Initialize progress tracking
    const progresses: FileUploadProgress[] = files.map((file) => ({
      fileName: file.name,
      progress: 0,
      status: 'pending',
    }));
    this.fileProgresses.set(progresses);

    const uploadResults: ChatFile[] = [];
    const uploadPromises: Promise<ChatFile | null>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadPromises.push(this.uploadSingleFile(file, roomId, i));
    }

    try {
      const results = await Promise.all(uploadPromises);
      for (const result of results) {
        if (result) {
          uploadResults.push(result);
        }
      }

      // Check if all files uploaded successfully
      if (uploadResults.length !== files.length) {
        this.error.set('Some files failed to upload');
      }

      return uploadResults;
    } catch (err) {
      console.error('[ChatUploadService] Upload failed:', err);
      this.error.set('Failed to upload files');
      return uploadResults;
    } finally {
      this.uploading.set(false);
    }
  }

  /**
   * Upload a single file with progress tracking
   */
  private async uploadSingleFile(
    file: File,
    roomId: string,
    index: number
  ): Promise<ChatFile | null> {
    return new Promise((resolve) => {
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const sanitizedName = this.sanitizeFileName(file.name);
      const fileName = `${timestamp}_${randomStr}_${sanitizedName}`;

      // Storage path: chat-attachments/{roomId}/{filename}
      const storagePath = `chat-attachments/${roomId}/${fileName}`;
      const storageRef = ref(this.storage, storagePath);

      // Update status to uploading
      this.updateFileProgress(index, { status: 'uploading', progress: 0 });

      const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Track progress
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          this.updateFileProgress(index, { progress });
          this.calculateTotalProgress();
        },
        (error) => {
          // Handle error
          console.error('[ChatUploadService] File upload error:', error);
          this.updateFileProgress(index, {
            status: 'error',
            error: this.getErrorMessage(error),
          });
          resolve(null);
        },
        async () => {
          // Upload completed - get download URL
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            this.updateFileProgress(index, { status: 'completed', progress: 100 });
            this.calculateTotalProgress();

            const chatFile: ChatFile = {
              name: file.name,
              url: downloadUrl,
              mimeType: file.type,
              sizeBytes: file.size,
              thumbnailUrl: this.isImage(file.type) ? downloadUrl : undefined,
            };

            resolve(chatFile);
          } catch (error) {
            console.error('[ChatUploadService] Failed to get download URL:', error);
            this.updateFileProgress(index, {
              status: 'error',
              error: 'Failed to get file URL',
            });
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Update progress for a specific file
   */
  private updateFileProgress(index: number, update: Partial<FileUploadProgress>): void {
    this.fileProgresses.update((progresses) => {
      const newProgresses = [...progresses];
      if (newProgresses[index]) {
        newProgresses[index] = { ...newProgresses[index], ...update };
      }
      return newProgresses;
    });
  }

  /**
   * Calculate overall upload progress
   */
  private calculateTotalProgress(): void {
    const progresses = this.fileProgresses();
    if (progresses.length === 0) {
      this.totalProgress.set(0);
      return;
    }

    const totalProgress = progresses.reduce((sum, p) => sum + p.progress, 0);
    this.totalProgress.set(Math.round(totalProgress / progresses.length));
  }

  /**
   * Reset upload state
   */
  reset(): void {
    this.uploading.set(false);
    this.totalProgress.set(0);
    this.fileProgresses.set([]);
    this.error.set(null);
  }

  /**
   * Check if file is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Sanitize filename for safe storage
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('permission') || message.includes('unauthorized')) {
        return 'Permission denied';
      }
      if (message.includes('quota')) {
        return 'Storage quota exceeded';
      }
      if (message.includes('network') || message.includes('offline')) {
        return 'Network error';
      }
    }

    return 'Upload failed';
  }
}
