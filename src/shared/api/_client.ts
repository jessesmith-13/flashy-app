// src/shared/api/_client.ts
import { API_BASE } from "@/supabase/runtime";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export class ApiError extends Error {
  status: number;
  bodyText?: string;

  constructor(message: string, status: number, bodyText?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export async function apiRequest<T>(
  path: string,
  accessToken: string | null | undefined,
  options: ApiRequestOptions = {}
): Promise<T> {
  if (!accessToken) {
    throw new ApiError("Not authenticated", 401);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => undefined);
    throw new ApiError(
      bodyText || `Request failed (${res.status})`,
      res.status,
      bodyText
    );
  }

  // allow void endpoints / 204
  if (res.status === 204) return undefined as T;

  // some endpoints might return empty body with 200
  const text = await res.text();
  if (!text) return undefined as T;

  return JSON.parse(text) as T;
}

export function jsonBody(body: JsonObject): Pick<RequestInit, "body"> {
  return { body: JSON.stringify(body) };
}
