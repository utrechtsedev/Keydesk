import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

/**
 * A stand-in for Google's OAuth and the Gmail API, for the Gmail mailbox tests. Like Gmail, it
 * gives sent messages a Message-ID of its own. Tests add mail, make Google forget an inbox's
 * history or withdraw access, and read what was sent, through its /_test endpoints.
 */
export const GOOGLE_CLIENT_ID = 'test-google-client';
export const GOOGLE_CLIENT_SECRET = 'test-google-secret';

interface Message {
	id: string;
	historyId: number;
	receivedAt: number;
	raw: string;
}

interface Account {
	inbox: Message[];
	sent: { id: string; raw: string; messageId: string }[];
	/** History records older than this are forgotten */
	historyKeptFrom: number;
	revoked: boolean;
}

export async function startFakeGoogle() {
	const accounts = new Map<string, Account>();
	const codes = new Map<string, string>();
	let historyId = 1000;
	let sentCount = 0;

	const account = (address: string) => {
		let found = accounts.get(address);
		if (!found) {
			found = { inbox: [], sent: [], historyKeptFrom: 0, revoked: false };
			accounts.set(address, found);
		}
		return found;
	};

	const json = (response: ServerResponse, status: number, body: unknown) => {
		response.writeHead(status, { 'content-type': 'application/json' });
		response.end(JSON.stringify(body));
	};
	const apiError = (response: ServerResponse, status: number, message: string) =>
		json(response, status, { error: { code: status, message } });
	const read = async (request: IncomingMessage) => {
		const chunks: Buffer[] = [];
		for await (const chunk of request) chunks.push(chunk as Buffer);
		return Buffer.concat(chunks).toString();
	};
	const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

	const server = createServer(async (request, response) => {
		const url = new URL(request.url!, 'http://fake');
		const path = url.pathname;
		const query = Object.fromEntries(url.searchParams);

		// The tests' own controls
		if (path === '/_test/messages' && request.method === 'POST') {
			const { address, raw } = JSON.parse(await read(request));
			const message = { id: `gmail-${++historyId}`, historyId, receivedAt: Date.now(), raw };
			account(address).inbox.push(message);
			return json(response, 200, { id: message.id });
		}
		if (path === '/_test/forget-history' && request.method === 'POST') {
			const { address } = JSON.parse(await read(request));
			account(address).historyKeptFrom = ++historyId;
			return json(response, 200, {});
		}
		if (path === '/_test/revoke' && request.method === 'POST') {
			const { address } = JSON.parse(await read(request));
			account(address).revoked = true;
			return json(response, 200, {});
		}
		if (path === '/_test/sent') {
			return json(response, 200, account(query.address).sent);
		}

		// Consent: the test says which account signs in, and whether it allows Keydesk in
		if (path === '/auth') {
			const back = new URL(query.redirect_uri);
			back.searchParams.set('state', query.state);
			if (query.grant === 'yes') {
				const code = crypto.randomUUID();
				codes.set(code, query.as_account);
				back.searchParams.set('code', code);
			} else {
				back.searchParams.set('error', 'access_denied');
			}
			response.writeHead(302, { location: back.toString() });
			return response.end();
		}

		if (path === '/token' && request.method === 'POST') {
			const form = Object.fromEntries(new URLSearchParams(await read(request)));
			if (form.client_id !== GOOGLE_CLIENT_ID || form.client_secret !== GOOGLE_CLIENT_SECRET) {
				return json(response, 401, { error: 'invalid_client' });
			}
			if (form.grant_type === 'authorization_code') {
				const address = codes.get(form.code);
				codes.delete(form.code);
				if (!address) return json(response, 400, { error: 'invalid_grant' });
				account(address);
				return json(response, 200, {
					access_token: `access:${address}`,
					refresh_token: `refresh:${address}`,
					id_token: `${base64url({ alg: 'none' })}.${base64url({
						aud: GOOGLE_CLIENT_ID,
						email: address,
						email_verified: true
					})}.`
				});
			}
			if (form.grant_type === 'refresh_token') {
				const address = form.refresh_token.replace(/^refresh:/, '');
				if (!accounts.has(address) || account(address).revoked) {
					return json(response, 400, { error: 'invalid_grant' });
				}
				return json(response, 200, { access_token: `access:${address}`, expires_in: 3599 });
			}
			return json(response, 400, { error: 'unsupported_grant_type' });
		}

		// Gmail, for the account the access token belongs to
		if (path.startsWith('/gmail/users/me/')) {
			const address = request.headers.authorization?.replace(/^Bearer access:/, '') ?? '';
			if (!accounts.has(address) || account(address).revoked) {
				return apiError(response, 401, 'Invalid credentials');
			}
			const mail = account(address);
			const route = path.slice('/gmail/users/me'.length);

			if (route === '/profile') {
				return json(response, 200, { emailAddress: address, historyId: String(historyId) });
			}

			if (route === '/history') {
				const start = Number(query.startHistoryId);
				if (start < mail.historyKeptFrom)
					return apiError(response, 404, 'Requested entity was not found.');
				const records = mail.inbox.filter((message) => message.historyId > start);
				const page = records.slice(0, Number(query.maxResults ?? 100));
				return json(response, 200, {
					history: page.map((message) => ({
						id: String(message.historyId),
						messagesAdded: [{ message: { id: message.id } }]
					})),
					...(records.length > page.length ? { nextPageToken: 'more' } : {}),
					historyId: String(historyId)
				});
			}

			if (route === '/messages' && request.method === 'GET') {
				const after = Number(query.q?.replace(/^after:/, '') ?? 0) * 1000;
				const messages = mail.inbox
					.filter((message) => message.receivedAt >= after)
					.reverse()
					.map((message) => ({ id: message.id }));
				return json(response, 200, { messages });
			}

			if (route === '/messages/send' && request.method === 'POST') {
				const { raw } = JSON.parse(await read(request));
				const id = `sent-${++sentCount}`;
				mail.sent.push({
					id,
					raw: Buffer.from(raw, 'base64url').toString(),
					messageId: `<${id}@mail.gmail.test>`
				});
				return json(response, 200, { id, threadId: id });
			}

			const message = route.match(/^\/messages\/([^/]+)$/);
			if (message) {
				const id = decodeURIComponent(message[1]);
				const sent = mail.sent.find((candidate) => candidate.id === id);
				if (sent && query.format === 'metadata') {
					return json(response, 200, {
						id,
						payload: { headers: [{ name: 'Message-Id', value: sent.messageId }] }
					});
				}
				const received = mail.inbox.find((candidate) => candidate.id === id);
				if (!received) return apiError(response, 404, 'Requested entity was not found.');
				return query.format === 'raw'
					? json(response, 200, { id, raw: Buffer.from(received.raw).toString('base64url') })
					: json(response, 200, { id, sizeEstimate: Buffer.byteLength(received.raw) });
			}
		}

		json(response, 404, { error: 'not found', path });
	});

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('The fake Google did not start');
	const url = `http://127.0.0.1:${address.port}`;

	return {
		url,
		close: () => new Promise<void>((resolve) => server.close(() => resolve()))
	};
}
