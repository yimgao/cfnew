export interface ProxyConfig {
  remark: string;
  host: string;
  path: string;
}

export class ApiError extends Error {}

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `request failed with status ${res.status}`;
    throw new ApiError(message);
  }
  return body;
}

export async function fetchConfig(apiBase: string, adminToken: string): Promise<ProxyConfig> {
  const res = await fetch(`${apiBase}/api/config`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return (await parseJsonOrThrow(res)) as ProxyConfig;
}

export async function saveConfig(
  apiBase: string,
  adminToken: string,
  config: ProxyConfig,
): Promise<ProxyConfig> {
  const res = await fetch(`${apiBase}/api/config`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });
  return (await parseJsonOrThrow(res)) as ProxyConfig;
}

export async function fetchSubscriptionLink(apiBase: string, subToken: string): Promise<string> {
  const res = await fetch(`${apiBase}/sub/${encodeURIComponent(subToken)}`);
  if (!res.ok) {
    throw new ApiError(`request failed with status ${res.status}`);
  }
  const base64 = await res.text();
  return atob(base64.trim());
}
