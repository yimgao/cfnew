import type { ProxyConfig } from './config'

export function buildVlessUri(config: ProxyConfig, uuid: string): string {
	const params = new URLSearchParams({
		encryption: 'none',
		security: 'tls',
		type: 'ws',
		host: config.host,
		path: config.path,
		sni: config.host,
	})
	return `vless://${uuid}@${config.host}:443?${params.toString()}#${encodeURIComponent(config.remark)}`
}

/** Standard v2ray-style subscription body: base64 of newline-separated share links. */
export function buildSubscriptionContent(config: ProxyConfig, uuid: string): string {
	const uri = buildVlessUri(config, uuid)
	return btoa(uri)
}
