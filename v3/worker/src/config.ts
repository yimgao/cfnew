const CONFIG_KEY = 'config'

export interface ProxyConfig {
	remark: string
	host: string
	path: string
}

export const DEFAULT_CONFIG: ProxyConfig = {
	remark: 'cfnew',
	host: '',
	path: '/',
}

export function isValidConfig(value: unknown): value is ProxyConfig {
	if (typeof value !== 'object' || value === null) return false
	const v = value as Record<string, unknown>
	return typeof v.remark === 'string' && typeof v.host === 'string' && typeof v.path === 'string'
}

export async function getConfig(kv: KVNamespace): Promise<ProxyConfig> {
	const stored = await kv.get<ProxyConfig>(CONFIG_KEY, 'json')
	if (stored && isValidConfig(stored)) return stored
	return DEFAULT_CONFIG
}

export async function putConfig(kv: KVNamespace, config: ProxyConfig): Promise<void> {
	await kv.put(CONFIG_KEY, JSON.stringify(config))
}
