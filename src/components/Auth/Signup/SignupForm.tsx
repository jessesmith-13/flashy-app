import { useState, useEffect } from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { TermsAcceptanceCheckboxes } from "./TermsAcceptanceCheckboxes";
import { Check, X, Loader2 } from "lucide-react";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SignupFormProps {
  onSubmit: (
    displayName: string,
    email: string,
    password: string
  ) => Promise<void>;
  onLoginClick: () => void;
  error?: string;
  loading?: boolean;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  onTermsChange: (checked: boolean) => void;
  onPrivacyChange: (checked: boolean) => void;
}

export function SignupForm({
  onSubmit,
  onLoginClick,
  error,
  loading,
  acceptedTerms,
  acceptedPrivacy,
  onTermsChange,
  onPrivacyChange,
}: SignupFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayNameStatus, setDisplayNameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [displayNameError, setDisplayNameError] = useState("");

  // Check display name availability with debouncing
  useEffect(() => {
    if (!displayName || displayName.trim().length === 0) {
      setDisplayNameStatus("idle");
      setDisplayNameError("");
      return;
    }

    setDisplayNameStatus("checking");
    setDisplayNameError("");

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/server/auth/check-displayname/${encodeURIComponent(
            displayName
          )}`,
          {
            headers: {
              Authorization: `Bearer ${anonKey}`,
              apikey: anonKey,
            },
          }
        );

        const data = await response.json();

        if (data.available) {
          setDisplayNameStatus("available");
        } else {
          setDisplayNameStatus("taken");
          setDisplayNameError(data.error || "Display name is already taken");
        }
      } catch (err) {
        console.error("Failed to check display name:", err);
        setDisplayNameStatus("idle");
        setDisplayNameError("Failed to check availability");
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't allow submission if display name is taken
    if (displayNameStatus === "taken") {
      return;
    }

    await onSubmit(displayName, email, password);
  };

  const isFormValid =
    displayName &&
    email &&
    password &&
    acceptedTerms &&
    acceptedPrivacy &&
    displayNameStatus !== "taken";

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <div className="relative">
            <Input
              id="displayName"
              type="text"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className={`mt-1 pr-10 ${
                displayNameStatus === "available"
                  ? "border-emerald-500 focus:border-emerald-500"
                  : displayNameStatus === "taken"
                  ? "border-red-500 focus:border-red-500"
                  : ""
              }`}
            />
            {displayName && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                {displayNameStatus === "checking" && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                {displayNameStatus === "available" && (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
                {displayNameStatus === "taken" && (
                  <X className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}
          </div>
          {displayNameStatus === "available" && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Display name is available!
            </p>
          )}
          {displayNameStatus === "taken" && displayNameError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {displayNameError}
            </p>
          )}
          {displayNameStatus !== "taken" &&
            displayNameStatus !== "available" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will be shown publicly instead of your email
              </p>
            )}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1"
          />
        </div>

        <TermsAcceptanceCheckboxes
          acceptedTerms={acceptedTerms}
          acceptedPrivacy={acceptedPrivacy}
          onTermsChange={onTermsChange}
          onPrivacyChange={onPrivacyChange}
        />

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !isFormValid}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onLoginClick}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm"
        >
          Already have an account? <span className="underline">Login here</span>
        </button>
      </div>
    </>
  );
}
