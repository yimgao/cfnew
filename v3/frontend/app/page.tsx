"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchConfig, fetchSubscriptionLink, saveConfig, type ProxyConfig } from "@/lib/api";
import { EMPTY_SETTINGS, loadSettings, saveSettings, type Settings } from "@/lib/settings";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; message: string };

function StatusLine({ status }: { status: Status }) {
  if (status.kind === "idle") return null;
  if (status.kind === "loading") return <p className="text-sm text-zinc-500">Loading...</p>;
  if (status.kind === "error") return <p className="text-sm text-red-600">{status.message}</p>;
  return <p className="text-sm text-green-600">{status.message}</p>;
}

export default function Home() {
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [config, setConfig] = useState<ProxyConfig>({ remark: "", host: "", path: "" });
  const [configStatus, setConfigStatus] = useState<Status>({ kind: "idle" });
  const [subLink, setSubLink] = useState("");
  const [subStatus, setSubStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    // localStorage is unavailable during static-export prerendering, so settings are
    // loaded post-mount instead of via a lazy useState initializer (which would cause
    // a hydration mismatch between the prerendered and client-rendered markup).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
  }, []);

  function updateSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  }

  async function handleLoadConfig() {
    setConfigStatus({ kind: "loading" });
    try {
      const loaded = await fetchConfig(settings.apiBase, settings.adminToken);
      setConfig(loaded);
      setConfigStatus({ kind: "ok", message: "Loaded." });
    } catch (err) {
      setConfigStatus({ kind: "error", message: err instanceof ApiError ? err.message : "Failed to load config." });
    }
  }

  async function handleSaveConfig() {
    setConfigStatus({ kind: "loading" });
    try {
      const saved = await saveConfig(settings.apiBase, settings.adminToken, config);
      setConfig(saved);
      setConfigStatus({ kind: "ok", message: "Saved." });
    } catch (err) {
      setConfigStatus({ kind: "error", message: err instanceof ApiError ? err.message : "Failed to save config." });
    }
  }

  async function handleFetchSubLink() {
    setSubStatus({ kind: "loading" });
    setSubLink("");
    try {
      const link = await fetchSubscriptionLink(settings.apiBase, settings.subToken);
      setSubLink(link);
      setSubStatus({ kind: "idle" });
    } catch (err) {
      setSubStatus({ kind: "error", message: err instanceof ApiError ? err.message : "Failed to fetch subscription link." });
    }
  }

  async function handleCopySubLink() {
    await navigator.clipboard.writeText(subLink);
    setSubStatus({ kind: "ok", message: "Copied to clipboard." });
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-8 px-6 py-16">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">cfnew control panel</h1>

        <section className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="text-sm font-medium text-zinc-500">Connection</h2>
          <label className="flex flex-col gap-1 text-sm">
            Worker URL
            <input
              className="rounded border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-black"
              placeholder="https://cfnew-v3-worker.example.workers.dev"
              value={settings.apiBase}
              onChange={(e) => updateSettings({ apiBase: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Admin token
            <input
              className="rounded border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-black"
              type="password"
              value={settings.adminToken}
              onChange={(e) => updateSettings({ adminToken: e.target.value })}
            />
          </label>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="text-sm font-medium text-zinc-500">Proxy config</h2>
          <label className="flex flex-col gap-1 text-sm">
            Remark
            <input
              className="rounded border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-black"
              value={config.remark}
              onChange={(e) => setConfig({ ...config, remark: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Host
            <input
              className="rounded border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-black"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Path
            <input
              className="rounded border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-black"
              value={config.path}
              onChange={(e) => setConfig({ ...config, path: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <button
              className="rounded bg-foreground px-4 py-2 text-sm text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
              onClick={handleLoadConfig}
            >
              Load
            </button>
            <button
              className="rounded border border-black/10 px-4 py-2 text-sm dark:border-white/10"
              onClick={handleSaveConfig}
            >
              Save
            </button>
          </div>
          <StatusLine status={configStatus} />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="text-sm font-medium text-zinc-500">Subscription link</h2>
          <label className="flex flex-col gap-1 text-sm">
            Subscription token
            <input
              className="rounded border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-black"
              type="password"
              value={settings.subToken}
              onChange={(e) => updateSettings({ subToken: e.target.value })}
            />
          </label>
          <button
            className="rounded bg-foreground px-4 py-2 text-sm text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
            onClick={handleFetchSubLink}
          >
            Fetch link
          </button>
          {subLink && (
            <div className="flex flex-col gap-2">
              <textarea
                className="rounded border border-black/10 px-3 py-2 text-xs dark:border-white/10 dark:bg-black"
                readOnly
                rows={3}
                value={subLink}
              />
              <button
                className="w-fit rounded border border-black/10 px-4 py-2 text-sm dark:border-white/10"
                onClick={handleCopySubLink}
              >
                Copy
              </button>
            </div>
          )}
          <StatusLine status={subStatus} />
        </section>
      </main>
    </div>
  );
}
