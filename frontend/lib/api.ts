import { ApiResponseError, normalizeApiErrorPayload } from "./api-errors";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("detailingToken");
}

export function setStoredToken(token: string) {
  window.localStorage.setItem("detailingToken", token);
}

export function clearStoredToken() {
  window.localStorage.removeItem("detailingToken");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    let payload: unknown = "No se pudo completar la operacion.";
    try {
      const rawBody = await response.text();
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = rawBody;
        }
      }
    } catch {
      payload = "No se pudo completar la operacion.";
    }
    throw new ApiResponseError(
      normalizeApiErrorPayload(payload, { status: response.status }),
      {
        status: response.status,
        payload,
      },
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function apiList<T>(path: string): Promise<T[]> {
  const payload = await apiFetch<T[] | { results: T[] }>(path);
  if (Array.isArray(payload)) return payload;
  return payload.results ?? [];
}

export async function downloadApiFile(path: string, filename: string) {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    throw new Error("No se pudo descargar el archivo.");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
