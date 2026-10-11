import { describe, expect, it } from 'vitest';
import { generateRandomString, getFileExtension } from './string.js';

describe('getFileExtension', () => {
	it.each([
		['invoice.pdf', 'pdf'],
		['archive.tar.gz', 'gz'],
		['README', ''],
		['.env', '']
	])('%s has extension "%s"', (fileName, extension) => {
		expect(getFileExtension(fileName)).toBe(extension);
	});
});

describe('generateRandomString', () => {
	it('returns the requested number of letters and digits', () => {
		expect(generateRandomString(24)).toMatch(/^[A-Za-z0-9]{24}$/);
	});
});
