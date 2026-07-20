import { describe, expect, it } from 'vitest'
import { parseVlessHeader } from '../src/vless'

function buildRequest(opts: {
	uuid?: string
	command?: number
	port?: number
	addressType?: 1 | 2 | 3
	address?: number[] | string
	payload?: number[]
}) {
	const uuidHex = (opts.uuid ?? '11111111-2222-3333-4444-555555555555').replace(/-/g, '')
	const uuidBytes = uuidHex.match(/../g)!.map((b) => parseInt(b, 16))

	const command = opts.command ?? 1
	const port = opts.port ?? 443
	const addressType = opts.addressType ?? 2
	const payload = opts.payload ?? [0xde, 0xad, 0xbe, 0xef]

	let addressBytes: number[]
	if (addressType === 2) {
		const domain = (opts.address as string) ?? 'example.com'
		addressBytes = [domain.length, ...[...domain].map((c) => c.charCodeAt(0))]
	} else {
		addressBytes = opts.address as number[]
	}

	const bytes = [
		0, // version
		...uuidBytes,
		0, // addons length
		command,
		(port >> 8) & 0xff,
		port & 0xff,
		addressType,
		...addressBytes,
		...payload,
	]
	return new Uint8Array(bytes).buffer
}

describe('parseVlessHeader', () => {
	it('parses a domain-based TCP request', () => {
		const buffer = buildRequest({ address: 'example.com' })
		const result = parseVlessHeader(buffer)
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.header.uuid).toBe('11111111-2222-3333-4444-555555555555')
		expect(result.header.command).toBe('tcp')
		expect(result.header.port).toBe(443)
		expect(result.header.address).toBe('example.com')
		const payload = new Uint8Array(buffer.slice(result.header.rawDataIndex))
		expect([...payload]).toEqual([0xde, 0xad, 0xbe, 0xef])
	})

	it('parses an IPv4 address', () => {
		const buffer = buildRequest({ addressType: 1, address: [127, 0, 0, 1], port: 8080 })
		const result = parseVlessHeader(buffer)
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.header.address).toBe('127.0.0.1')
		expect(result.header.port).toBe(8080)
	})

	it('parses an IPv6 address', () => {
		const addressBytes = new Array(16).fill(0)
		addressBytes[15] = 1 // ::1
		const buffer = buildRequest({ addressType: 3, address: addressBytes })
		const result = parseVlessHeader(buffer)
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.header.address).toBe('0:0:0:0:0:0:0:1')
	})

	it('rejects a truncated header', () => {
		const buffer = new Uint8Array(10).buffer
		const result = parseVlessHeader(buffer)
		expect(result.ok).toBe(false)
	})

	it('rejects an unknown command byte', () => {
		const buffer = buildRequest({ command: 9 })
		const result = parseVlessHeader(buffer)
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(result.error).toMatch(/unknown command/)
	})

	it('exposes the correct rawDataIndex so payload bytes are never dropped', () => {
		const buffer = buildRequest({ address: 'a.co', payload: [1, 2, 3] })
		const result = parseVlessHeader(buffer)
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(buffer.byteLength - result.header.rawDataIndex).toBe(3)
	})
})
