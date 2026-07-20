import { app, type AppEnv } from './app'
import { handleVlessWebSocket } from './relay'

export type Env = AppEnv['Bindings']

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.headers.get('Upgrade') === 'websocket') {
			return handleVlessWebSocket(request, env)
		}
		return app.fetch(request, env, ctx)
	},
}
