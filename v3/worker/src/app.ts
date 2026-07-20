import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getConfig, isValidConfig, putConfig } from './config'
import { buildSubscriptionContent } from './subscription'

export interface AppEnv {
	Bindings: {
		PROXY_UUID: string
		ADMIN_TOKEN: string
		SUB_TOKEN: string
		CONFIG_KV: KVNamespace
	}
}

export const app = new Hono<AppEnv>()

// Control panel lives on a different origin (Cloudflare Pages) than this Worker,
// and auth is a Bearer token (not cookies), so an open CORS policy here doesn't
// weaken the ADMIN_TOKEN/SUB_TOKEN checks below.
app.use('/api/*', cors())
app.use('/sub/*', cors())

app.use('/api/*', async (c, next) => {
	const auth = c.req.header('Authorization')
	if (auth !== `Bearer ${c.env.ADMIN_TOKEN}`) {
		return c.json({ error: 'unauthorized' }, 401)
	}
	await next()
})

app.get('/api/config', async (c) => {
	const config = await getConfig(c.env.CONFIG_KV)
	return c.json(config)
})

app.put('/api/config', async (c) => {
	const body = await c.req.json().catch(() => null)
	if (!isValidConfig(body)) {
		return c.json({ error: 'invalid config: expected { remark, host, path } as strings' }, 400)
	}
	await putConfig(c.env.CONFIG_KV, body)
	return c.json(body)
})

app.get('/sub/:token', async (c) => {
	if (c.req.param('token') !== c.env.SUB_TOKEN) {
		return c.notFound()
	}
	const config = await getConfig(c.env.CONFIG_KV)
	const content = buildSubscriptionContent(config, c.env.PROXY_UUID)
	return c.text(content)
})

app.notFound((c) => c.json({ error: 'not found' }, 404))
