// src/shared/api/support/types.ts

export type SupportContactCategory =
  | "bug"
  | "feature"
  | "billing"
  | "account"
  | "feedback"
  | "other";

export type SubmitContactRequest = {
  category: SupportContactCategory;
  subject: string;
  message: string;
};

// your backend currently seems to return either { success: true } or { error: string }
export type SubmitContactResponseApi = { success: true } | { error: string };
