import fs from 'fs';
import path from 'path';
import { generateRandomString } from '$lib/utils/string';
import { getFileExtension } from '$lib/utils/string';
import type { Attachment } from '$lib/types';

export interface UploadedFileData {
  fileId: string;
  storedFilename: string;
  originalFilename: string;
  filePath: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a file to local storage
 * @param file - The File object from FormData
 * @param options - Upload options
 * @returns File metadata including path
 */
export async function uploadFile(
  file: File,
  options: Attachment
): Promise<UploadedFileData> {
  const { maxFileSizeMB = 10, allowedMimeTypes = [], enabled = true } = options;

  // Validate upload is enabled
  if (!enabled) {
    throw new Error('File uploads are currently disabled');
  }

  // Validate file input
  if (!file) {
    throw new Error('No file provided');
  }

  if (!file.name || file.name.trim() === '') {
    throw new Error('File must have a valid name');
  }

  const fileSize = file.size;
  const mimeType = file.type || 'application/octet-stream';
  const maxSizeBytes = maxFileSizeMB * 1024 * 1024;

  // Validate file size
  if (fileSize === 0) {
    throw new Error(`File "${file.name}" is empty`);
  }

  if (fileSize > maxSizeBytes) {
    throw new Error(
      `File "${file.name}" exceeds maximum size of ${maxFileSizeMB}MB (${(fileSize / 1024 / 1024).toFixed(2)}MB provided)`
    );
  }

  // Validate MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(mimeType)) {
    throw new Error(
      `File "${file.name}" has unsupported type "${mimeType}"`
    );
  }

  console.log('File validated:', {
    filename: file.name,
    contentType: mimeType,
    size: fileSize
  });

  // Generate unique filename
  const fileId = generateRandomString(24);
  const extension = getFileExtension(path.basename(file.name));
  const storedFilename = extension ? `${fileId}.${extension}` : fileId;
  const filePath = path.join('./uploads', storedFilename);

  try {
    // Ensure uploads directory exists
    if (!fs.existsSync('./uploads')) {
      try {
        fs.mkdirSync('./uploads', { recursive: true });
      } catch (error) {
        throw new Error(
          `Failed to create uploads directory: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Convert file to buffer
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (error) {
      throw new Error(
        `Failed to read file "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Write file to disk
    try {
      await fs.promises.writeFile(filePath, buffer);
    } catch (error) {
      throw new Error(
        `Failed to save file "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    console.log('File uploaded successfully:', {
      storedFilename,
      originalFilename: file.name,
      filePath
    });

    return {
      fileId,
      storedFilename,
      originalFilename: file.name,
      filePath,
      size: fileSize,
      mimeType
    };
  } catch (error) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log('Cleaned up partial file:', filePath);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup partial file:', cleanupError);
    }

    throw error;
  }
}
