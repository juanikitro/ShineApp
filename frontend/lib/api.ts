import { ApiResponseError, normalizeApiErrorPayload } from "./api-errors";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9001/api";
const API_BASE_URL = API_URL.replace(/\/$/, "");

type PaginatedPayload<T> = {
  next?: string | null;
  results?: T[];
};

function apiRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/api/")) {
    try {
      return `${new URL(API_BASE_URL).origin}${path}`;
    } catch {
      return path;
    }
  }

  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}/${path}`;
}
const AUTH_TOKEN_STORAGE_KEY = "detailingToken";

async function readErrorPayload(response: Response) {
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
  return payload;
}

function raiseApiError(response: Response, payload: unknown): never {
  throw new ApiResponseError(
    normalizeApiErrorPayload(payload, { status: response.status }),
    {
      status: response.status,
      payload,
    },
  );
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  const sessionToken = window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (sessionToken) return sessionToken;

  const legacyToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (legacyToken) {
    window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, legacyToken);
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
  return legacyToken;
}

export function setStoredToken(token: string) {
  window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function clearStoredToken() {
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export type ApiRequestInit = RequestInit & { signal?: AbortSignal };

const inflightGets = new Map<string, Promise<unknown>>();

function inflightKey(path: string) {
  return `GET:${apiRequestUrl(path)}`;
}

async function performFetch<T>(path: string, options: ApiRequestInit): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  const response = await fetch(apiRequestUrl(path), {
    ...options,
    headers,
    cache: options.cache ?? "no-store",
    signal: options.signal,
  });

  if (!response.ok) {
    raiseApiError(response, await readErrorPayload(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function apiFetch<T>(path: string, options: ApiRequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET" || options.body !== undefined) {
    return performFetch<T>(path, options);
  }
  const key = inflightKey(path);
  const existing = inflightGets.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }
  const promise = performFetch<T>(path, options).finally(() => {
    inflightGets.delete(key);
  });
  inflightGets.set(key, promise);
  return promise;
}

export async function publicApiFetch<T>(path: string, options: ApiRequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Datos publicos: el llamador puede optar por cache (ej. landing publica) via
  // options.cache. Por defecto no-store para no servir datos viejos.
  const response = await fetch(apiRequestUrl(path), {
    ...options,
    headers,
    cache: options.cache ?? "no-store",
    signal: options.signal,
  });

  if (!response.ok) {
    raiseApiError(response, await readErrorPayload(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export type ApiPage<T> = {
  results: T[];
  next: string | null;
  previous: string | null;
  count: number | null;
};

export async function apiPage<T>(path: string, options: ApiRequestInit = {}): Promise<ApiPage<T>> {
  const payload = await apiFetch<T[] | PaginatedPayload<T>>(path, options);
  if (Array.isArray(payload)) {
    return { results: payload, next: null, previous: null, count: payload.length };
  }
  const anyPayload = payload as PaginatedPayload<T> & { previous?: string | null; count?: number };
  return {
    results: Array.isArray(anyPayload.results) ? anyPayload.results : [],
    next: anyPayload.next ?? null,
    previous: anyPayload.previous ?? null,
    count: typeof anyPayload.count === "number" ? anyPayload.count : null,
  };
}

export async function apiList<T>(path: string, options: ApiRequestInit = {}): Promise<T[]> {
  const payload = await apiFetch<T[] | PaginatedPayload<T>>(path, options);
  if (Array.isArray(payload)) return payload;

  const results = Array.isArray(payload.results) ? [...payload.results] : [];
  let next = payload.next ?? null;

  while (next) {
    const nextPayload = await apiFetch<T[] | PaginatedPayload<T>>(next, options);
    if (Array.isArray(nextPayload)) {
      results.push(...nextPayload);
      break;
    }
    if (Array.isArray(nextPayload.results)) {
      results.push(...nextPayload.results);
    }
    next = nextPayload.next ?? null;
  }

  return results;
}

export async function downloadApiFile(path: string, filename: string) {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }
  const response = await fetch(apiRequestUrl(path), { headers });
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
