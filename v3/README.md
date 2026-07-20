# cfnew v3 部署指南

v3 由两个独立部署单元组成：

- `v3/worker` — Cloudflare Worker（Hono.js），负责 VLESS 中转、KV 配置存储、订阅链接、管理接口鉴权。
- `v3/frontend` — Next.js 静态导出的控制面板，部署到 Cloudflare Pages，通过浏览器管理 Worker 上的配置。

两者是不同的 Cloudflare 资源、不同的域名，通过 CORS + Bearer Token 通信，没有共享的构建产物。

## 前置条件

- 一个 Cloudflare 账号
- 本地安装 Node.js 20+
- 本地登录 wrangler：`cd v3/worker && npx wrangler login`（会打开浏览器完成 OAuth 授权）

## 第一次手动部署（之后交给 CI）

### 1. 部署 Worker

```bash
cd v3/worker
npm ci

# 创建真正的 KV namespace，替换 wrangler.toml 里的占位 id
npx wrangler kv namespace create CONFIG_KV
# 输出里会给一个 id，把它填进 wrangler.toml 的 [[kv_namespaces]] 段
```

编辑 `wrangler.toml`，把 `id = "local_dev_placeholder"` 换成上一步拿到的真实 id。

```bash
# 设置生产环境机密（会提示逐个输入值，不会回显）
npx wrangler secret put PROXY_UUID
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put SUB_TOKEN

# 部署
npx wrangler deploy
```

部署成功后 wrangler 会打印出 Worker 的 URL，形如：
`https://cfnew-v3-worker.<your-subdomain>.workers.dev`

记下这个 URL，以及你刚才设置的 `ADMIN_TOKEN` 和 `SUB_TOKEN`——控制面板要用。

### 2. 部署 Frontend

```bash
cd v3/frontend
npm ci
npm run build          # 生成静态导出目录 out/

npx wrangler pages deploy out --project-name=cfnew-v3-frontend
```

首次运行如果项目不存在，wrangler 会自动创建。部署成功后会打印出 Pages 的访问 URL。

### 3. 连接前端和后端

打开 Pages 部署出来的 URL，在页面顶部的 "Connection" 区域填入：

- **Worker URL**：第 1 步部署出来的 workers.dev 地址
- **Admin token**：第 1 步设置的 `ADMIN_TOKEN`

点 "Load" 应该能看到默认配置。修改后点 "Save" 会写回 KV。

在 "Subscription link" 区域填入 `SUB_TOKEN`，点 "Fetch link" 可以拿到 base64 编码的订阅内容（解码后是 `vless://...` 链接）。

这些设置存在浏览器 localStorage 里，只影响你自己的浏览器，不会上传到任何地方。

## 交给 CI 自动部署

`.github/workflows/v3-worker-deploy.yml` 和 `.github/workflows/v3-frontend-deploy.yml` 会在对应目录有改动 push 到 `main` 时自动部署（也可以在 Actions 页面手动触发）。

需要在 GitHub 仓库的 Settings → Secrets and variables → Actions 里添加两个 secrets：

- `CLOUDFLARE_API_TOKEN` — 在 Cloudflare Dashboard → My Profile → API Tokens 创建，建议用 "Edit Cloudflare Workers" 模板（需要同时有 Workers 和 Pages 的编辑权限）
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare Dashboard 右侧栏能直接看到

添加好之后，之后每次改 `v3/worker/**` 或 `v3/frontend/**` 并 push 到 `main`，对应的服务就会自动重新部署。

CI 只负责部署代码，不会碰 `PROXY_UUID` / `ADMIN_TOKEN` / `SUB_TOKEN` 这三个机密——它们只在第一次手动部署时用 `wrangler secret put` 设置一次，之后常驻在 Cloudflare 上，重新部署不会清空它们。如果要轮换，手动重新 `wrangler secret put` 即可。
