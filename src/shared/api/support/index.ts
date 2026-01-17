// src/shared/api/support/index.ts
import { apiRequest, jsonBody } from "@/shared/api/_client";
import type { SubmitContactRequest, SubmitContactResponseApi } from "./types";

export async function submitContactMessage(
  accessToken: string,
  payload: SubmitContactRequest
): Promise<void> {
  const res = await apiRequest<SubmitContactResponseApi>(
    "/support/contact",
    accessToken,
    {
      method: "POST",
      ...jsonBody({
        category: payload.category,
        subject: payload.subject,
        message: payload.message,
      }),
    }
  );

  // apiRequest already throws on !ok, but if your backend returns 200 with { error },
  // this catches that too.
  if ("error" in res) {
    throw new Error(res.error || "Failed to submit contact form");
  }
}
