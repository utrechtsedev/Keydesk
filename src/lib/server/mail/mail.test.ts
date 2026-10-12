import { describe, expect, it } from 'vitest';
import { automaticReason, ticketNumberIn } from './incoming.js';
import { replySubject } from './outgoing.js';
import { sanitizeEmailHtml } from './sanitize.js';

const headers = (entries: Record<string, string>) => ({
	headers: new Map(Object.entries(entries)) as never
});

describe('ticketNumberIn', () => {
	it.each([
		['Re: Printer broken [TKT-42]', 'TKT-', 42],
		['tkt-7 still broken', 'TKT-', 7],
		['About HD.12', 'HD.', 12],
		['Order 42', 'TKT-', null],
		['About HDX12', 'HD.', null]
	])('finds the number in %j with prefix %j', (subject, prefix, number) => {
		expect(ticketNumberIn(subject, prefix)).toBe(number);
	});
});

describe('automaticReason', () => {
	it.each([
		[{ 'auto-submitted': 'auto-replied' }, 'Auto-Submitted'],
		[{ 'x-autoreply': 'yes' }, 'Automatic reply'],
		[{ precedence: 'bulk' }, 'Precedence']
	])('recognizes %j', (entries, reason) => {
		expect(automaticReason(headers(entries))).toContain(reason);
	});

	it('lets a person through', () => {
		expect(automaticReason(headers({ 'auto-submitted': 'no', precedence: 'list' }))).toBeNull();
	});
});

describe('replySubject', () => {
	it.each([
		['Printer broken', 'Re: Printer broken [TKT-42]'],
		['Re: Printer broken', 'Re: Printer broken [TKT-42]'],
		['Printer broken [TKT-42]', 'Re: Printer broken [TKT-42]'],
		['AW: Drucker kaputt', 'AW: Drucker kaputt [TKT-42]']
	])('answers %j as %j', (subject, expected) => {
		expect(replySubject(subject, 'TKT-42')).toBe(expected);
	});
});

describe('sanitizeEmailHtml', () => {
	it('removes scripts and event handlers', () => {
		const html = sanitizeEmailHtml('<p onclick="steal()">Hi<script>alert(1)</script></p>');
		expect(html).toBe('<p>Hi</p>');
	});

	it('keeps the content of colored tables but drops the colors', () => {
		const html = sanitizeEmailHtml(
			'<table bgcolor="#ff0000"><tr><td style="color: red; text-align: center">Order 42</td></tr></table>'
		);
		expect(html).toContain('Order 42');
		expect(html).not.toContain('bgcolor');
		expect(html).not.toContain('color: red');
		expect(html).toContain('text-align:center');
	});

	it('opens links in a new tab without a referrer and drops javascript links', () => {
		expect(sanitizeEmailHtml('<a href="https://example.com">site</a>')).toBe(
			'<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">site</a>'
		);
		expect(sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript');
	});

	it('drops styles that load from elsewhere', () => {
		expect(
			sanitizeEmailHtml('<div style="border: url(https://tracker.example/p.gif)">x</div>')
		).toBe('<div>x</div>');
	});
});
