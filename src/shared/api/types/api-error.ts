// src/shared/api/types/api-error.ts
export type ApiErrorResponse = { error: string };

export function isApiErrorResponse(x: unknown): x is ApiErrorResponse {
  return (
    typeof x === "object" &&
    x !== null &&
    "error" in x &&
    typeof (x as { error?: unknown }).error === "string"
  );
}
