import { useState } from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  error?: string;
  loading?: boolean;
}

export function LoginForm({
  onSubmit,
  onForgotPassword,
  error,
  loading,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            Forgot password?
          </button>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1"
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={loading}
      >
        {loading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
