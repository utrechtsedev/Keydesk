import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

/**
 * A stand-in for Microsoft's sign-in and Graph, for the Microsoft 365 mailbox tests. It knows the
 * protocol steps Keydesk uses: the OpenID Connect sign-in, admin consent, the client credentials
 * token, the inbox delta query, a message's MIME source and sendMail. Tests set up tenants and
 * mail, and read what was sent, through its /_test endpoints.
 */
export const CLIENT_ID = 'test-client';
export const CLIENT_SECRET = 'test-secret';

interface Message {
	id: string;
	seq: number;
	raw: string;
}

export async function startFakeMicrosoft() {
	/** The addresses in each tenant */
	const tenants = new Map<string, Set<string>>();
	/** Tenants whose admin granted Keydesk's application permissions */
	const consented = new Set<string>();
	/** Sign-in codes and the tenant of the account that signed in */
	const codes = new Map<string, string>();
	const inboxes = new Map<string, Message[]>();
	const sent: { address: string; mime: string }[] = [];
	let seq = 0;

	const json = (response: ServerResponse, status: number, body: unknown) => {
		response.writeHead(status, { 'content-type': 'application/json' });
		response.end(JSON.stringify(body));
	};
	const graphError = (response: ServerResponse, status: number, message: string) =>
		json(response, status, { error: { code: 'Error', message } });
	const back = (response: ServerResponse, to: string, params: Record<string, string>) => {
		const url = new URL(to);
		for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
		response.writeHead(302, { location: url.toString() });
		response.end();
	};
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
		if (path === '/_test/tenants' && request.method === 'POST') {
			const { tenantId, addresses, consent } = JSON.parse(await read(request));
			tenants.set(tenantId, new Set(addresses));
			if (consent) consented.add(tenantId);
			return json(response, 200, {});
		}
		if (path === '/_test/messages' && request.method === 'POST') {
			const { address, raw } = JSON.parse(await read(request));
			const message = { id: `message-${++seq}`, seq, raw };
			inboxes.set(address, [...(inboxes.get(address) ?? []), message]);
			return json(response, 200, { id: message.id });
		}
		if (path === '/_test/sent') {
			return json(
				response,
				200,
				sent.filter((mail) => mail.address === query.address)
			);
		}

		// Sign-in: the account signs in to the tenant the test names
		if (path === '/login/organizations/oauth2/v2.0/authorize') {
			if (query.client_id !== CLIENT_ID)
				return json(response, 400, { error: 'unauthorized_client' });
			const code = crypto.randomUUID();
			codes.set(code, query.as_tenant);
			return back(response, query.redirect_uri, { code, state: query.state });
		}

		// Admin consent; `override_tenant` stands for someone changing the address on the way back
		const consent = path.match(/^\/login\/([^/]+)\/v2\.0\/adminconsent$/);
		if (consent) {
			if (query.grant !== 'yes') {
				return back(response, query.redirect_uri, {
					error: 'access_denied',
					error_description: 'The admin declined.',
					state: query.state
				});
			}
			consented.add(consent[1]);
			return back(response, query.redirect_uri, {
				admin_consent: 'True',
				tenant: query.override_tenant ?? consent[1],
				state: query.state
			});
		}

		const token = path.match(/^\/login\/([^/]+)\/oauth2\/v2\.0\/token$/);
		if (token && request.method === 'POST') {
			const form = Object.fromEntries(new URLSearchParams(await read(request)));
			if (form.client_id !== CLIENT_ID || form.client_secret !== CLIENT_SECRET) {
				return json(response, 401, { error: 'invalid_client' });
			}
			if (form.grant_type === 'authorization_code') {
				const tenantId = codes.get(form.code);
				codes.delete(form.code);
				if (!tenantId) return json(response, 400, { error: 'invalid_grant' });
				const idToken = `${base64url({ alg: 'none' })}.${base64url({ aud: CLIENT_ID, tid: tenantId })}.`;
				return json(response, 200, { id_token: idToken, token_type: 'Bearer' });
			}
			if (form.grant_type === 'client_credentials') {
				if (!consented.has(token[1])) {
					return json(response, 400, {
						error: 'invalid_client',
						error_description: 'Keydesk has no permissions in this tenant.'
					});
				}
				return json(response, 200, { access_token: `app:${token[1]}`, expires_in: 3599 });
			}
			return json(response, 400, { error: 'unsupported_grant_type' });
		}

		// Graph: an app token reads the mailboxes of its own tenant only
		const graph = path.match(/^\/graph\/users\/([^/]+)(\/.*)$/);
		if (graph) {
			const address = decodeURIComponent(graph[1]);
			const tenantId = request.headers.authorization?.replace(/^Bearer app:/, '') ?? '';
			if (!tenants.get(tenantId)?.has(address)) {
				return graphError(response, 404, `The mailbox ${address} isn't in this tenant.`);
			}
			const route = graph[2];
			const inbox = inboxes.get(address) ?? [];

			if (route === '/mailFolders/inbox') return json(response, 200, { id: 'inbox' });

			if (route === '/mailFolders/inbox/messages/delta') {
				const pageSize = Number(
					String(request.headers.prefer ?? '').match(/odata\.maxpagesize=(\d+)/)?.[1] ?? 10
				);
				const link = (name: string, value: number) =>
					`http://${request.headers.host}${url.pathname}?${name}=${value}`;
				// A new delta round with a receivedDateTime filter from now: nothing yet
				if (query.$filter) {
					return json(response, 200, { value: [], '@odata.deltaLink': link('$deltatoken', seq) });
				}
				const after = Number(query.$deltatoken ?? query.$skiptoken);
				const fresh = inbox.filter((message) => message.seq > after);
				const page = fresh.slice(0, pageSize);
				const last = page.at(-1)?.seq ?? after;
				return json(response, 200, {
					value: page.map((message) => ({ id: message.id })),
					...(fresh.length > pageSize
						? { '@odata.nextLink': link('$skiptoken', last) }
						: { '@odata.deltaLink': link('$deltatoken', last) })
				});
			}

			const value = route.match(/^\/messages\/([^/]+)\/\$value$/);
			if (value) {
				const message = inbox.find((candidate) => candidate.id === decodeURIComponent(value[1]));
				if (!message) return graphError(response, 404, 'No such message.');
				response.writeHead(200, {
					'content-type': 'message/rfc822',
					'content-length': Buffer.byteLength(message.raw)
				});
				return response.end(message.raw);
			}

			if (route === '/sendMail' && request.method === 'POST') {
				if (request.headers['content-type'] !== 'text/plain') {
					return graphError(response, 415, 'Expected base64 MIME.');
				}
				sent.push({ address, mime: Buffer.from(await read(request), 'base64').toString() });
				response.writeHead(202);
				return response.end();
			}
		}

		json(response, 404, { error: 'not found', path });
	});

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('The fake Microsoft did not start');
	const url = `http://127.0.0.1:${address.port}`;

	return {
		url,
		close: () => new Promise<void>((resolve) => server.close(() => resolve()))
	};
}
