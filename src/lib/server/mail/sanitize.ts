import sanitizeHtml from 'sanitize-html';

/** A style value that can't load anything: no `url(...)`, which would let an email track readers */
const noUrl = /^(?!.*url\s*\().*$/i;
const length = /^\d+(?:px|pt|em|%)?$/;
const lengths = /^\d+(?:px|pt|em|%)?(?:\s\d+(?:px|pt|em|%)?)*$/;

/**
 * Cleans the HTML of an incoming email for showing it in a ticket: only formatting tags and
 * harmless styles stay, links open in a new tab without passing a referrer, and colors go so the
 * message fits the app's theme. Plain text emails come in through `textToHtml` instead.
 */
export function sanitizeEmailHtml(html: string): string {
	return sanitizeHtml(html, {
		allowedTags: [
			'p',
			'br',
			'strong',
			'b',
			'em',
			'i',
			'u',
			'strike',
			'del',
			's',
			'ul',
			'ol',
			'li',
			'blockquote',
			'pre',
			'code',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'a',
			'span',
			'div',
			'img',
			'center',
			'hr'
		],
		allowedAttributes: {
			a: ['href', 'title', 'target', 'rel'],
			img: ['src', 'alt', 'width', 'height'],
			table: ['width', 'cellpadding', 'cellspacing', 'border'],
			td: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign'],
			th: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign'],
			div: ['align'],
			p: ['align'],
			'*': ['style']
		},
		allowedStyles: {
			'*': {
				'text-align': [/^(left|right|center|justify)$/],
				'font-weight': [/^\d+$/, /^(bold|normal)$/],
				'font-style': [/^(italic|normal)$/],
				'font-size': [/^\d+(?:px|pt|em|%)$/],
				'font-family': [noUrl],
				'line-height': [length],
				padding: [lengths],
				'padding-top': [length],
				'padding-right': [length],
				'padding-bottom': [length],
				'padding-left': [length],
				margin: [lengths],
				width: [length],
				'max-width': [length],
				height: [length],
				border: [noUrl],
				'border-radius': [length],
				display: [/^(block|inline|inline-block|none|table|table-cell)$/],
				'vertical-align': [noUrl],
				'text-decoration': [/^(none|underline)$/]
			}
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		// Images inside the email itself, such as a pasted screenshot
		allowedSchemesByTag: { img: ['http', 'https', 'data'] },
		transformTags: {
			a: (tagName, attribs) => ({
				tagName: 'a',
				attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' }
			})
		}
	});
}
