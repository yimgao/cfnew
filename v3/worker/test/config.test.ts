import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, getConfig, isValidConfig, putConfig, type ProxyConfig } from '../src/config'

function makeMockKv(initial?: Record<string, string>) {
	const store = new Map(Object.entries(initial ?? {}))
	return {
		async get(key: string, type?: string) {
			const raw = store.get(key)
			if (raw === undefined) return null
			return type === 'json' ? JSON.parse(raw) : raw
		},
		async put(key: string, value: string) {
			store.set(key, value)
		},
	} as unknown as KVNamespace
}

describe('isValidConfig', () => {
	it('accepts a well-formed config', () => {
		expect(isValidConfig({ remark: 'a', host: 'b', path: '/c' })).toBe(true)
	})

	it('rejects missing fields', () => {
		expect(isValidConfig({ remark: 'a', host: 'b' })).toBe(false)
	})

	it('rejects non-string fields', () => {
		expect(isValidConfig({ remark: 'a', host: 1, path: '/c' })).toBe(false)
	})

	it('rejects non-objects', () => {
		expect(isValidConfig(null)).toBe(false)
		expect(isValidConfig('config')).toBe(false)
	})
})

describe('getConfig / putConfig', () => {
	it('returns the default config when KV is empty', async () => {
		const kv = makeMockKv()
		expect(await getConfig(kv)).toEqual(DEFAULT_CONFIG)
	})

	it('round-trips a stored config', async () => {
		const kv = makeMockKv()
		const config: ProxyConfig = { remark: 'test', host: 'example.com', path: '/ws' }
		await putConfig(kv, config)
		expect(await getConfig(kv)).toEqual(config)
	})

	it('falls back to default when stored value is malformed', async () => {
		const kv = makeMockKv({ config: JSON.stringify({ remark: 'only-this' }) })
		expect(await getConfig(kv)).toEqual(DEFAULT_CONFIG)
	})
})
