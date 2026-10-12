const entities: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

/** Escapes text so it shows as typed inside HTML */
export function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (character) => entities[character]);
}

/**
 * Turns what someone typed in a plain text field into the HTML that ticket messages are stored as:
 * special characters escaped, line breaks kept.
 */
export function textToHtml(text: string): string {
	return escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>');
}
