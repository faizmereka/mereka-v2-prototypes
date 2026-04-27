import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { environment } from '../../../../environments/environment';

/**
 * Upload result interface
 */
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: UploadError;
}

/**
 * Upload error interface
 */
export interface UploadError {
  code: string;
  message: string;
  details?: string;
}

/**
 * Upload validation options
 */
export interface UploadValidationOptions {
  maxSizeBytes?: number; // Default: 10MB
  allowedTypes?: string[]; // Default: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Default validation options
 */
const DEFAULT_VALIDATION: UploadValidationOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

/**
 * Error codes for upload failures
 */
export const UploadErrorCodes = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  INVALID_INPUT: 'INVALID_INPUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private storage;

  // Upload state signals
  readonly uploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly lastError = signal<UploadError | null>(null);

  constructor() {
    // Initialize Firebase if not already initialized
    const app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
    this.storage = getStorage(app);
  }

  /**
   * Upload a File with validation and error handling
   */
  async uploadFile(
    file: File,
    path: string,
    options: UploadValidationOptions = {}
  ): Promise<UploadResult> {
    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.lastError.set(null);

    try {
      // Validate file
      const validationError = this.validateFile(file, options);
      if (validationError) {
        this.lastError.set(validationError);
        return { success: false, error: validationError };
      }

      // Generate unique filename
      const fileName = `${Date.now()}_${this.randomString(8)}_${this.sanitizeFileName(file.name)}`;
      const fullPath = `${path}/${fileName}`;

      // Upload to Firebase
      const storageRef = ref(this.storage, fullPath);
      await uploadBytes(storageRef, file);
      this.uploadProgress.set(100);

      const url = await getDownloadURL(storageRef);
      return { success: true, url };
    } catch (error) {
      const uploadError = this.parseFirebaseError(error);
      this.lastError.set(uploadError);
      return { success: false, error: uploadError };
    } finally {
      this.uploading.set(false);
    }
  }

  /**
   * Upload a Blob with validation and error handling
   */
  async uploadBlob(
    blob: Blob,
    path: string,
    fileName?: string,
    options: UploadValidationOptions = {}
  ): Promise<UploadResult> {
    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.lastError.set(null);

    try {
      // Validate blob size and type
      const validationError = this.validateBlob(blob, options);
      if (validationError) {
        this.lastError.set(validationError);
        return { success: false, error: validationError };
      }

      // Generate filename
      const extension = this.getExtensionFromMimeType(blob.type);
      const name = fileName || `${Date.now()}_${this.randomString(8)}.${extension}`;
      const fullPath = `${path}/${name}`;

      // Upload to Firebase
      const storageRef = ref(this.storage, fullPath);
      await uploadBytes(storageRef, blob);
      this.uploadProgress.set(100);

      const url = await getDownloadURL(storageRef);
      return { success: true, url };
    } catch (error) {
      const uploadError = this.parseFirebaseError(error);
      this.lastError.set(uploadError);
      return { success: false, error: uploadError };
    } finally {
      this.uploading.set(false);
    }
  }

  /**
   * Upload a base64 image with validation and error handling
   */
  async uploadBase64(
    base64: string,
    path: string,
    options: UploadValidationOptions = {}
  ): Promise<UploadResult> {
    // Skip if already a URL (not base64)
    if (base64.startsWith('http://') || base64.startsWith('https://')) {
      return { success: true, url: base64 };
    }

    // Skip if empty
    if (!base64) {
      return {
        success: false,
        error: {
          code: UploadErrorCodes.INVALID_INPUT,
          message: 'No image data provided',
        },
      };
    }

    try {
      const blob = this.base64ToBlob(base64);
      const extension = this.getExtensionFromBase64(base64);
      const fileName = `${Date.now()}_${this.randomString(8)}.${extension}`;

      return this.uploadBlob(blob, path, fileName, options);
    } catch (error) {
      const uploadError: UploadError = {
        code: UploadErrorCodes.INVALID_INPUT,
        message: 'Invalid base64 image data',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      this.lastError.set(uploadError);
      return { success: false, error: uploadError };
    }
  }

  /**
   * Upload multiple files with error handling
   */
  async uploadMultiple(
    files: File[],
    path: string,
    options: UploadValidationOptions = {}
  ): Promise<{ results: UploadResult[]; hasErrors: boolean }> {
    const results: UploadResult[] = [];
    let hasErrors = false;

    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadFile(files[i], path, options);
      results.push(result);
      if (!result.success) {
        hasErrors = true;
      }
      // Update progress for multiple files
      this.uploadProgress.set(Math.round(((i + 1) / files.length) * 100));
    }

    return { results, hasErrors };
  }

  /**
   * Validate a File object
   */
  validateFile(file: File, options: UploadValidationOptions = {}): UploadError | null {
    const opts = { ...DEFAULT_VALIDATION, ...options };

    // Check file size
    if (opts.maxSizeBytes && file.size > opts.maxSizeBytes) {
      const maxSizeMB = Math.round(opts.maxSizeBytes / (1024 * 1024));
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        code: UploadErrorCodes.FILE_TOO_LARGE,
        message: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
        details: `Maximum allowed: ${maxSizeMB}MB, File size: ${fileSizeMB}MB`,
      };
    }

    // Check file type
    if (opts.allowedTypes && !opts.allowedTypes.includes(file.type)) {
      const allowedExtensions = opts.allowedTypes.map((t) => t.split('/')[1]).join(', ');
      return {
        code: UploadErrorCodes.INVALID_FILE_TYPE,
        message: `Invalid file type. Allowed types: ${allowedExtensions}`,
        details: `File type "${file.type}" is not allowed`,
      };
    }

    return null;
  }

  /**
   * Validate a Blob object
   */
  validateBlob(blob: Blob, options: UploadValidationOptions = {}): UploadError | null {
    const opts = { ...DEFAULT_VALIDATION, ...options };

    // Check size
    if (opts.maxSizeBytes && blob.size > opts.maxSizeBytes) {
      const maxSizeMB = Math.round(opts.maxSizeBytes / (1024 * 1024));
      const blobSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      return {
        code: UploadErrorCodes.FILE_TOO_LARGE,
        message: `File size (${blobSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      };
    }

    // Check type
    if (opts.allowedTypes && blob.type && !opts.allowedTypes.includes(blob.type)) {
      const allowedExtensions = opts.allowedTypes.map((t) => t.split('/')[1]).join(', ');
      return {
        code: UploadErrorCodes.INVALID_FILE_TYPE,
        message: `Invalid file type. Allowed types: ${allowedExtensions}`,
      };
    }

    return null;
  }

  /**
   * Validate image dimensions (async - requires loading image)
   */
  async validateImageDimensions(
    file: File,
    options: UploadValidationOptions
  ): Promise<UploadError | null> {
    if (!options.minWidth && !options.minHeight && !options.maxWidth && !options.maxHeight) {
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (options.minWidth && img.width < options.minWidth) {
          resolve({
            code: UploadErrorCodes.INVALID_DIMENSIONS,
            message: `Image width (${img.width}px) is less than minimum required (${options.minWidth}px)`,
          });
          return;
        }

        if (options.minHeight && img.height < options.minHeight) {
          resolve({
            code: UploadErrorCodes.INVALID_DIMENSIONS,
            message: `Image height (${img.height}px) is less than minimum required (${options.minHeight}px)`,
          });
          return;
        }

        if (options.maxWidth && img.width > options.maxWidth) {
          resolve({
            code: UploadErrorCodes.INVALID_DIMENSIONS,
            message: `Image width (${img.width}px) exceeds maximum allowed (${options.maxWidth}px)`,
          });
          return;
        }

        if (options.maxHeight && img.height > options.maxHeight) {
          resolve({
            code: UploadErrorCodes.INVALID_DIMENSIONS,
            message: `Image height (${img.height}px) exceeds maximum allowed (${options.maxHeight}px)`,
          });
          return;
        }

        resolve(null);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          code: UploadErrorCodes.INVALID_INPUT,
          message: 'Could not load image for dimension validation',
        });
      };

      img.src = url;
    });
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error: UploadError): string {
    return error.message;
  }

  /**
   * Clear last error
   */
  clearError(): void {
    this.lastError.set(null);
  }

  /**
   * Parse Firebase Storage errors into UploadError
   */
  private parseFirebaseError(error: unknown): UploadError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('permission') || message.includes('unauthorized')) {
        return {
          code: UploadErrorCodes.PERMISSION_DENIED,
          message: 'You do not have permission to upload files',
          details: error.message,
        };
      }

      if (message.includes('quota') || message.includes('exceeded')) {
        return {
          code: UploadErrorCodes.STORAGE_QUOTA_EXCEEDED,
          message: 'Storage quota exceeded. Please contact support.',
          details: error.message,
        };
      }

      if (message.includes('network') || message.includes('offline')) {
        return {
          code: UploadErrorCodes.NETWORK_ERROR,
          message: 'Network error. Please check your internet connection and try again.',
          details: error.message,
        };
      }

      return {
        code: UploadErrorCodes.UPLOAD_FAILED,
        message: 'Failed to upload file. Please try again.',
        details: error.message,
      };
    }

    return {
      code: UploadErrorCodes.UNKNOWN_ERROR,
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  /**
   * Convert base64 string to Blob
   */
  private base64ToBlob(base64: string): Blob {
    // Remove data URL prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const mimeType = this.getMimeTypeFromBase64(base64);

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Extract MIME type from base64 data URL
   */
  private getMimeTypeFromBase64(base64: string): string {
    const match = base64.match(/data:([^;]+);/);
    return match ? match[1] : 'image/jpeg';
  }

  /**
   * Get file extension from base64 MIME type
   */
  private getExtensionFromBase64(base64: string): string {
    const mimeType = this.getMimeTypeFromBase64(base64);
    return this.getExtensionFromMimeType(mimeType);
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };
    return extensions[mimeType] || 'jpg';
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
   * Generate a random string for unique file names
   */
  private randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
