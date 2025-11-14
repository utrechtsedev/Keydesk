import sanitizeHtml from 'sanitize-html';

/**
 * Sanitizes HTML content by removing potentially dangerous tags, attributes, and styles
 * while preserving safe formatting and structure.
 * 
 * This function uses sanitize-html to clean email content, allowing only specific
 * HTML tags and CSS properties that are safe to display. It automatically adds
 * security attributes to links and removes color/background-color styles to prevent
 * styling conflicts.
 * 
 * @param html - The HTML content to sanitize (preferred format)
 * @param text - Plain text fallback if HTML is empty or invalid
 * @returns A sanitized HTML string with only allowed tags and safe attributes
 * 
 * @example
 * ```typescript
 * const safe = sanitize(
 *   '<script>alert("xss")</script><p>Hello</p>',
 *   'Hello'
 * );
 * // Returns: '<p>Hello</p>'
 * ```
 * 
 * @remarks
 * - Removes all color and background-color CSS properties
 * - Adds target="_blank" and security attributes to all links
 * - Filters out elements with bgcolor attributes
 * - Falls back to text content if html is empty/null
 */
export function sanitize(html: string, text: string): string {
  return sanitizeHtml(html || text, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 'strike', 'del',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'span', 'div', 'img', 'center'
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'style'],
      'img': ['src', 'alt', 'width', 'height', 'style'],
      'table': ['width', 'cellpadding', 'cellspacing', 'border', 'style'],
      'td': ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'style'],
      'th': ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'style'],
      'tr': ['style'],
      'div': ['style', 'align'],
      'p': ['style', 'align'],
      'span': ['style'],
      '*': ['style']
    },
    allowedStyles: {
      '*': {
        // NO color or background-color at all!
        'text-align': [/^(left|right|center|justify)$/],
        'font-weight': [/^\d+$/, /^(bold|normal)$/],
        'font-style': [/^(italic|normal)$/],
        'font-size': [/^\d+(?:px|pt|em|%)$/],
        'font-family': [/.*/],
        'line-height': [/^\d+(?:px|pt|em|%)?$/],
        'padding': [/^\d+(?:px|pt|em|%)?(?:\s\d+(?:px|pt|em|%)?)*$/],
        'padding-top': [/^\d+(?:px|pt|em|%)?$/],
        'padding-right': [/^\d+(?:px|pt|em|%)?$/],
        'padding-bottom': [/^\d+(?:px|pt|em|%)?$/],
        'padding-left': [/^\d+(?:px|pt|em|%)?$/],
        'margin': [/^\d+(?:px|pt|em|%)?(?:\s\d+(?:px|pt|em|%)?)*$/],
        'width': [/^\d+(?:px|pt|em|%)?$/],
        'max-width': [/^\d+(?:px|pt|em|%)?$/],
        'height': [/^\d+(?:px|pt|em|%)?$/],
        'border': [/.*/],
        'border-radius': [/^\d+(?:px|pt|em|%)?$/],
        'display': [/^(block|inline|inline-block|none|table|table-cell)$/],
        'vertical-align': [/.*/],
        'text-decoration': [/^(none|underline)$/]
      }
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    transformTags: {
      'a': (tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer nofollow'
        }
      })
    },
    // Remove bgcolor attributes too
    exclusiveFilter: (frame) => {
      return frame.attribs.bgcolor !== undefined;
    }
  });
}
