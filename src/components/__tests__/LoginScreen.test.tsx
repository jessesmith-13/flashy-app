import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoginScreen } from "../Auth/Login/LoginScreen";
import * as api from "../../../utils/api";
import { useStore } from "@/shared/state/useStore";
import type { Session } from "@supabase/supabase-js";

//
// ✅ Reusable mock session (fully typed)
//
const mockSession: Session = {
  access_token: "mock_access_token",
  refresh_token: "mock_refresh_token",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "user_123",
    email: "test@flashy.app",
    app_metadata: {},
    user_metadata: { name: "Test User" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  },
};

vi.mock("../../../utils/api");

describe("LoginScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset Zustand store before each test
    useStore.setState(useStore.getState());
  });

  //
  // ✅ Renders UI elements
  //
  it("renders email and password inputs", () => {
    render(<LoginScreen />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  //
  // ✅ Successful login flow
  //
  it("calls api.signIn and updates store on success", async () => {
    const setAuth = vi.fn();
    vi.spyOn(useStore.getState(), "setAuth").mockImplementation(setAuth);
    vi.spyOn(api, "signIn").mockResolvedValue({
      session: mockSession,
      user: mockSession.user,
    });

    render(<LoginScreen />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "flashy@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => expect(api.signIn).toHaveBeenCalledTimes(1));
    expect(setAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user_123",
        email: "test@flashy.app",
        displayName: "Test User",
        subscriptionTier: "free",
        decksPublic: true,
      }),
      mockSession.access_token
    );
  });

  //
  // ✅ Failed login flow
  //
  it("shows an error message if login fails", async () => {
    vi.spyOn(api, "signIn").mockRejectedValue(
      new Error("Invalid login credentials")
    );

    render(<LoginScreen />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "fail@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    );
  });

  //
  // ✅ Forgot password form toggle
  //
  it("shows forgot password form when clicked", async () => {
    render(<LoginScreen />);
    fireEvent.click(screen.getByText(/forgot password/i));
    expect(
      screen.getByText(/we'll send you a password reset link/i)
    ).toBeInTheDocument();
  });
});
