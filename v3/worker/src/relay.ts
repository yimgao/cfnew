import { connect } from 'cloudflare:sockets'
import { parseVlessHeader } from './vless'

export interface RelayEnv {
	PROXY_UUID: string
}

export function handleVlessWebSocket(_request: Request, env: RelayEnv): Response {
	const pair = new WebSocketPair()
	const [client, server] = Object.values(pair)
	server.accept()

	let remoteWriter: WritableStreamDefaultWriter<Uint8Array> | null = null
	let headerParsed = false

	server.addEventListener('message', (event: MessageEvent) => {
		void (async () => {
			try {
				const data = event.data as ArrayBuffer

				if (!headerParsed) {
					const result = parseVlessHeader(data)
					if (!result.ok) {
						server.close(1008, result.error)
						return
					}
					const { header } = result
					if (header.uuid !== env.PROXY_UUID) {
						server.close(1008, 'invalid uuid')
						return
					}
					if (header.command !== 'tcp') {
						server.close(1008, `unsupported command: ${header.command}`)
						return
					}
					headerParsed = true

					const socket = connect({ hostname: header.address, port: header.port })
					remoteWriter = socket.writable.getWriter()

					// VLESS response: version(1) + addons length(1, always 0 here)
					server.send(new Uint8Array([header.version, 0]))

					pipeRemoteToClient(socket.readable, server)

					const payload = data.slice(header.rawDataIndex)
					if (payload.byteLength > 0) {
						await remoteWriter.write(new Uint8Array(payload))
					}
					return
				}

				if (remoteWriter) {
					await remoteWriter.write(new Uint8Array(data))
				}
			} catch (err) {
				server.close(1011, (err as Error).message)
			}
		})()
	})

	server.addEventListener('close', () => {
		remoteWriter?.close().catch(() => {})
	})

	return new Response(null, { status: 101, webSocket: client })
}

async function pipeRemoteToClient(readable: ReadableStream<Uint8Array>, ws: WebSocket) {
	const reader = readable.getReader()
	try {
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			ws.send(value)
		}
	} catch {
		// remote socket closed or errored; fall through to close client side
	} finally {
		try {
			ws.close(1000)
		} catch {
			// already closed
		}
	}
}
