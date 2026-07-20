import { describe, expect, it } from 'vitest'
import { buildSubscriptionContent, buildVlessUri } from '../src/subscription'
import type { ProxyConfig } from '../src/config'

const config: ProxyConfig = { remark: 'my node', host: 'worker.example.com', path: '/ws' }
const uuid = '11111111-2222-3333-4444-555555555555'

describe('buildVlessUri', () => {
	it('embeds uuid, host, and path into a vless:// uri', () => {
		const uri = buildVlessUri(config, uuid)
		expect(uri.startsWith(`vless://${uuid}@worker.example.com:443?`)).toBe(true)
		expect(uri).toContain('type=ws')
		expect(uri).toContain('security=tls')
		expect(uri).toContain('path=%2Fws')
		expect(uri).toContain('#my%20node')
	})
})

describe('buildSubscriptionContent', () => {
	it('produces a base64-encoded share link', () => {
		const content = buildSubscriptionContent(config, uuid)
		const decoded = atob(content)
		expect(decoded).toBe(buildVlessUri(config, uuid))
	})
})
