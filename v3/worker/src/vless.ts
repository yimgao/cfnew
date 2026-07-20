export type VlessCommand = 'tcp' | 'udp' | 'mux'

export interface VlessHeader {
	version: number
	uuid: string
	command: VlessCommand
	addressType: 1 | 2 | 3
	address: string
	port: number
	/** byte offset in the input buffer where payload data begins */
	rawDataIndex: number
}

export type ParseResult =
	| { ok: true; header: VlessHeader }
	| { ok: false; error: string }

const COMMANDS: Record<number, VlessCommand> = { 1: 'tcp', 2: 'udp', 3: 'mux' }

function uuidFromBytes(bytes: Uint8Array): string {
	const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Parses a VLESS request header from the first WebSocket frame.
 * Layout: version(1) uuid(16) addonsLen(1) addons(N) command(1) port(2, BE) addrType(1) address(...) payload(...)
 */
export function parseVlessHeader(buffer: ArrayBuffer): ParseResult {
	if (buffer.byteLength < 24) {
		return { ok: false, error: 'header too short' }
	}
	const view = new DataView(buffer)
	const bytes = new Uint8Array(buffer)

	const version = view.getUint8(0)
	const uuid = uuidFromBytes(bytes.slice(1, 17))

	const addonsLen = view.getUint8(17)
	let offset = 18 + addonsLen

	if (buffer.byteLength < offset + 1 + 2 + 1) {
		return { ok: false, error: 'header truncated (addons)' }
	}

	const commandByte = view.getUint8(offset)
	const command = COMMANDS[commandByte]
	if (!command) {
		return { ok: false, error: `unknown command ${commandByte}` }
	}
	offset += 1

	const port = view.getUint16(offset)
	offset += 2

	const addressType = view.getUint8(offset) as 1 | 2 | 3
	offset += 1

	let address: string
	if (addressType === 1) {
		if (buffer.byteLength < offset + 4) return { ok: false, error: 'header truncated (ipv4)' }
		address = bytes.slice(offset, offset + 4).join('.')
		offset += 4
	} else if (addressType === 2) {
		if (buffer.byteLength < offset + 1) return { ok: false, error: 'header truncated (domain len)' }
		const domainLen = view.getUint8(offset)
		offset += 1
		if (buffer.byteLength < offset + domainLen) return { ok: false, error: 'header truncated (domain)' }
		address = new TextDecoder().decode(bytes.slice(offset, offset + domainLen))
		offset += domainLen
	} else if (addressType === 3) {
		if (buffer.byteLength < offset + 16) return { ok: false, error: 'header truncated (ipv6)' }
		const parts: string[] = []
		for (let i = 0; i < 8; i++) {
			parts.push(view.getUint16(offset + i * 2).toString(16))
		}
		address = parts.join(':')
		offset += 16
	} else {
		return { ok: false, error: `unknown address type ${addressType}` }
	}

	return {
		ok: true,
		header: { version, uuid, command, addressType, address, port, rawDataIndex: offset },
	}
}
