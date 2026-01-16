import { useStore } from "@/shared/state/useStore";
import { signOut } from "./api/auth";

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export const handleAuthError = async (error: unknown) => {
  // Check if this is a 401 error
  if (
    error instanceof Error &&
    (error.message.includes("401") ||
      error.message.includes("Unauthorized") ||
      error.message.includes("Invalid Refresh Token"))
  ) {
    console.log(
      "Authentication error detected, clearing session and redirecting to login"
    );

    // Clear the session
    try {
      await signOut();
    } catch (signOutError) {
      console.log(
        "SignOut failed during error handling (session likely already expired)"
      );
    }

    // Clear the store
    const { logout, setCurrentView } = useStore.getState();
    logout();
    setCurrentView("login");

    throw new AuthenticationError(
      "Your session has expired. Please log in again."
    );
  }

  // Re-throw other errors
  throw error;
};

// Wrapper for API calls that automatically handles auth errors
export async function withAuthErrorHandling<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    await handleAuthError(error);
    // This line will never be reached if handleAuthError throws
    throw error;
  }
}
