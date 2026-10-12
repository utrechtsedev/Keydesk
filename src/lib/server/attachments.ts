import { env } from 'cloudflare:workers';
import type { Attachment } from '#lib/types/index.js';
import { getFileExtension } from '#lib/utils/string.js';

export interface StoredAttachment {
	/** The name the attachment is stored and linked under */
	fileName: string;
	originalFileName: string;
	/** Where the file is in the attachments bucket */
	storageKey: string;
	size: number;
	mimeType: string;
}

/**
 * Checks a file against the organization's attachment settings. Throws with a message for the
 * person who uploaded it.
 */
function checkAttachment(file: File, settings: Attachment): void {
	const { maxFileSizeMB = 10, allowedMimeTypes = [], enabled = true } = settings;

	if (!enabled) {
		throw new Error('File uploads are currently disabled');
	}
	if (!file.name || file.name.trim() === '') {
		throw new Error('File must have a valid name');
	}
	if (file.size === 0) {
		throw new Error(`File "${file.name}" is empty`);
	}
	if (file.size > maxFileSizeMB * 1024 * 1024) {
		throw new Error(
			`File "${file.name}" exceeds maximum size of ${maxFileSizeMB}MB (${(file.size / 1024 / 1024).toFixed(2)}MB provided)`
		);
	}
	const mimeType = file.type || 'application/octet-stream';
	if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(mimeType)) {
		throw new Error(`File "${file.name}" has unsupported type "${mimeType}"`);
	}
}

/**
 * Stores a file in the attachments bucket, under its organization: every key starts with
 * `organizations/<id>/`, so one organization's files never share a key with another's.
 */
export async function storeAttachment(
	organizationId: number,
	file: File,
	settings: Attachment
): Promise<StoredAttachment> {
	checkAttachment(file, settings);

	const extension = getFileExtension(file.name);
	const fileName = extension ? `${crypto.randomUUID()}.${extension}` : crypto.randomUUID();
	const storageKey = `organizations/${organizationId}/attachments/${fileName}`;
	const mimeType = file.type || 'application/octet-stream';

	// The file itself rather than its stream: R2 needs to know the length up front
	await env.ATTACHMENTS.put(storageKey, file, {
		httpMetadata: { contentType: mimeType }
	});

	return {
		fileName,
		originalFileName: file.name,
		storageKey,
		size: file.size,
		mimeType
	};
}

/** The stored file, or null when the bucket doesn't have it */
export function readAttachment(storageKey: string) {
	return env.ATTACHMENTS.get(storageKey);
}
