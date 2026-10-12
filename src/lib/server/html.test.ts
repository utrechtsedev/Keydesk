import { describe, expect, it } from 'vitest';
import { escapeHtml, textToHtml } from './html.js';

describe('escapeHtml', () => {
	it('escapes the characters HTML gives a meaning', () => {
		expect(escapeHtml('He said "<b>hi</b>" & it\'s fine')).toBe(
			'He said &quot;&lt;b&gt;hi&lt;/b&gt;&quot; &amp; it&#39;s fine'
		);
	});
});

describe('textToHtml', () => {
	it('keeps line breaks and shows markup as typed', () => {
		expect(textToHtml('Hallo,\r\n<b>vet</b>\nGroet')).toBe(
			'Hallo,<br>&lt;b&gt;vet&lt;/b&gt;<br>Groet'
		);
	});
});
