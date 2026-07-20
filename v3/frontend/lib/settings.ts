const KEYS = {
  apiBase: "cfnew:apiBase",
  adminToken: "cfnew:adminToken",
  subToken: "cfnew:subToken",
} as const;

export interface Settings {
  apiBase: string;
  adminToken: string;
  subToken: string;
}

export const EMPTY_SETTINGS: Settings = { apiBase: "", adminToken: "", subToken: "" };

export function loadSettings(): Settings {
  if (typeof window === "undefined") return EMPTY_SETTINGS;
  return {
    apiBase: window.localStorage.getItem(KEYS.apiBase) ?? "",
    adminToken: window.localStorage.getItem(KEYS.adminToken) ?? "",
    subToken: window.localStorage.getItem(KEYS.subToken) ?? "",
  };
}

export function saveSettings(settings: Settings): void {
  window.localStorage.setItem(KEYS.apiBase, settings.apiBase);
  window.localStorage.setItem(KEYS.adminToken, settings.adminToken);
  window.localStorage.setItem(KEYS.subToken, settings.subToken);
}
