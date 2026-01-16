// src/utils/__tests__/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "../../../../utils/api";
import { supabaseClient } from "../../../../utils/api";
import type {
  Session,
  AuthError,
  OAuthResponse,
  AuthTokenResponsePassword,
  AuthTokenResponsePasswordless,
  AuthResponse,
} from "@supabase/supabase-js";

// ---------- Utilities ----------

const createJsonResponse = (
  body: unknown,
  init?: { status?: number }
): Response => {
  const responseInit: ResponseInit = {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
    },
  };
  return new Response(JSON.stringify(body), responseInit);
};

const createTextResponse = (
  text: string,
  init?: { status?: number }
): Response => {
  const responseInit: ResponseInit = {
    status: init?.status ?? 200,
    headers: {},
  };
  return new Response(text, responseInit);
};

// ---------- Mock session ----------

const mockSession: Session = {
  access_token: "mock_access_token",
  refresh_token: "mock_refresh_token",
  expires_in: 3600,
  token_type: "bearer",
  provider_token: null,
  provider_refresh_token: null,
  user: {
    id: "user_123",
    email: "test@flashy.app",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: { name: "Test User" },
    created_at: new Date().toISOString(),
    role: "authenticated",
    factors: [],
    identities: null,
    is_anonymous: false,
    last_sign_in_at: new Date().toISOString(),
    phone: "",
    phone_confirmed_at: null,
    confirmed_at: null,
    email_confirmed_at: null,
    updated_at: new Date().toISOString(),
    banned_until: null,
    raw_app_meta_data: {},
    raw_user_meta_data: {},
  },
};

// ---------- Global setup ----------

declare global {
  // So TypeScript knows we are overwriting fetch in tests

  var fetch: typeof fetch;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();

  global.fetch = vi.fn() as unknown as typeof fetch;

  // jsdom gives us window.location, but make sure origin is set
  Object.defineProperty(window, "location", {
    value: new URL("https://flashy.local"),
    writable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------- AUTH TESTS ----------

describe("Auth API", () => {
  describe("signUp", () => {
    it("calls signup endpoint and returns data on success", async () => {
      const mockResponseBody = { user: { id: "1", email: "test@flashy.app" } };

      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(mockResponseBody)
      );

      const result = await api.signUp("test@flashy.app", "123456", "Test User");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as unknown as vi.Mock).mock.calls[0];
      expect(String(url)).toMatch(/signup/);
      expect((options as RequestInit).method).toBe("POST");

      expect(result).toEqual(mockResponseBody);
    });

    it("throws when response is not ok", async () => {
      const errorBody = { error: "Sign up failed" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(errorBody, { status: 400 })
      );

      await expect(api.signUp("bad", "123", "x")).rejects.toThrow(
        "Sign up failed"
      );
    });
  });

  describe("signIn", () => {
    it("returns session and user data from Supabase", async () => {
      const signInMock = vi
        .spyOn(supabaseClient.auth, "signInWithPassword")
        .mockResolvedValue({
          data: { session: mockSession, user: mockSession.user },
          error: null,
        } as AuthTokenResponsePassword);

      const result = await api.signIn("test@flashy.app", "123456");

      expect(signInMock).toHaveBeenCalledWith({
        email: "test@flashy.app",
        password: "123456",
      });

      expect(result.session?.access_token).toBe("mock_access_token");
      expect(result.user?.email).toBe("test@flashy.app");
    });

    it("throws when Supabase returns an error", async () => {
      vi.spyOn(supabaseClient.auth, "signInWithPassword").mockResolvedValue({
        data: { session: null, user: null },
        error: { message: "Invalid credentials" } as AuthError,
      } as AuthTokenResponsePassword);

      await expect(api.signIn("x@x.com", "wrong")).rejects.toThrow(
        "Invalid credentials"
      );
    });
  });

  describe("signInWithGoogle", () => {
    it("calls Supabase OAuth with google provider and returns data", async () => {
      const mockOAuthResponse: OAuthResponse = {
        data: { provider: "google", url: "https://accounts.google.com" },
        error: null,
      };

      const oauthMock = vi
        .spyOn(supabaseClient.auth, "signInWithOAuth")
        .mockResolvedValue(mockOAuthResponse);

      const result = await api.signInWithGoogle();

      expect(oauthMock).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });

      expect(result.provider).toBe("google");
    });

    it("throws on error", async () => {
      const mockOAuthResponse: OAuthResponse = {
        data: null,
        error: { message: "OAuth failed" } as AuthError,
      };

      vi.spyOn(supabaseClient.auth, "signInWithOAuth").mockResolvedValue(
        mockOAuthResponse
      );

      await expect(api.signInWithGoogle()).rejects.toThrow("OAuth failed");
    });
  });

  describe("resetPassword", () => {
    it("calls Supabase resetPasswordForEmail and returns data", async () => {
      const resetMock = vi
        .spyOn(supabaseClient.auth, "resetPasswordForEmail")
        .mockResolvedValue({
          data: { user: mockSession.user },
          error: null,
        } as AuthTokenResponsePasswordless);

      const result = await api.resetPassword("test@flashy.app");

      expect(resetMock).toHaveBeenCalledWith("test@flashy.app", {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      expect(result.user?.id).toBe("user_123");
    });

    it("throws when resetPasswordForEmail returns an error", async () => {
      vi.spyOn(supabaseClient.auth, "resetPasswordForEmail").mockResolvedValue({
        data: { user: null },
        error: { message: "Reset failed" } as AuthError,
      } as AuthTokenResponsePasswordless);

      await expect(api.resetPassword("bad@user.com")).rejects.toThrow(
        "Reset failed"
      );
    });
  });

  describe("signOut", () => {
    it("calls supabaseClient.auth.signOut and does not throw on success", async () => {
      vi.spyOn(supabaseClient.auth, "signOut").mockResolvedValue({
        error: null,
      } as AuthResponse);

      await expect(api.signOut()).resolves.not.toThrow();
      expect(supabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it("swallows signOut errors (logs warning but does not throw)", async () => {
      vi.spyOn(supabaseClient.auth, "signOut").mockResolvedValue({
        error: { message: "Sign out error" } as AuthError,
      } as AuthResponse);

      await expect(api.signOut()).resolves.not.toThrow();
    });
  });

  describe("getSession", () => {
    it("returns session when available", async () => {
      vi.spyOn(supabaseClient.auth, "getSession").mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const session = await api.getSession();
      expect(session?.access_token).toBe("mock_access_token");
    });

    it("returns null when getSession has error", async () => {
      vi.spyOn(supabaseClient.auth, "getSession").mockResolvedValue({
        data: { session: null },
        error: { message: "No session" } as AuthError,
      });

      const session = await api.getSession();
      expect(session).toBeNull();
    });
  });
});

// ---------- DECKS API ----------

describe("Deck API", () => {
  const accessToken = "mock_access";

  describe("fetchDecks", () => {
    it("returns decks on success", async () => {
      const mockDecks = [{ id: "1", name: "Biology Basics" }];
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify({ decks: mockDecks }))
      );

      const result = await api.fetchDecks(accessToken);

      expect(result).toEqual(mockDecks);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("throws when response is not ok", async () => {
      const errorBody = { error: "Server error" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify(errorBody), { status: 500 })
      );

      await expect(api.fetchDecks(accessToken)).rejects.toThrow("Server error");
    });
  });

  describe("createDeck", () => {
    it("creates a deck and returns it", async () => {
      const deckPayload = { name: "New Deck" };
      const mockDeck = { id: "abc", name: "New Deck" };

      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ deck: mockDeck })
      );

      const result = await api.createDeck(accessToken, deckPayload);
      expect(result).toEqual(mockDeck);
    });

    it("throws when create fails", async () => {
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ error: "Failed to create deck" }, { status: 400 })
      );

      await expect(api.createDeck(accessToken, { name: "" })).rejects.toThrow(
        "Failed to create deck"
      );
    });
  });

  describe("updateDeck", () => {
    it("updates a deck", async () => {
      const mockDeck = { id: "abc", name: "Updated" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ deck: mockDeck })
      );

      const result = await api.updateDeck(accessToken, "abc", {
        name: "Updated",
      });
      expect(result).toEqual(mockDeck);
    });
  });

  describe("updateDeckPositions", () => {
    it("updates deck positions", async () => {
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ success: true })
      );

      const positions = [{ id: "a", position: 0 }];
      const result = await api.updateDeckPositions(accessToken, positions);
      expect(result).toEqual({ success: true });
    });
  });

  describe("updateCardPositions", () => {
    it("updates card positions", async () => {
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ success: true })
      );

      const positions = [{ id: "card1", position: 0 }];
      const result = await api.updateCardPositions(
        accessToken,
        "deck1",
        positions
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe("publishDeck", () => {
    it("publishes a deck", async () => {
      const body = { category: "Science", subtopic: "Biology" };
      const mockResponseBody = { deck: { id: "1", name: "Bio", ...body } };

      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(mockResponseBody)
      );

      const result = await api.publishDeck(accessToken, "1", body);
      expect(result).toEqual(mockResponseBody);
    });
  });

  describe("deleteDeck", () => {
    it("deletes a deck", async () => {
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ success: true })
      );

      const result = await api.deleteDeck(accessToken, "deck1");
      expect(result).toEqual({ success: true });
    });
  });
});

// ---------- CARD API ----------

describe("Card API", () => {
  const accessToken = "mock_access";
  const deckId = "deck_1";

  describe("fetchCards", () => {
    it("returns cards on success", async () => {
      const mockCards = [{ id: "c1", front: "Hola", back: "Hello" }];
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify({ cards: mockCards }))
      );

      const result = await api.fetchCards(accessToken, deckId);
      expect(result).toEqual(mockCards);
    });

    it("throws when not ok", async () => {
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify({ error: "Server error" }), {
          status: 500,
        })
      );

      await expect(api.fetchCards(accessToken, deckId)).rejects.toThrow(
        "Server error"
      );
    });
  });

  describe("createCard", () => {
    it("creates card and returns it", async () => {
      const mockCard = { id: "c1", front: "Hola", back: "Hello" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ card: mockCard })
      );

      const result = await api.createCard(accessToken, deckId, {
        front: "Hola",
        back: "Hello",
        cardType: "classic-flip",
      });
      expect(result).toEqual(mockCard);
    });
  });

  describe("updateCard", () => {
    it("updates card and returns it", async () => {
      const mockCard = { id: "c1", front: "Hola!!", back: "Hello" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ card: mockCard })
      );

      const result = await api.updateCard(accessToken, deckId, "c1", {
        front: "Hola!!",
      });
      expect(result).toEqual(mockCard);
    });
  });

  describe("deleteCard", () => {
    it("deletes card", async () => {
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ success: true })
      );

      const result = await api.deleteCard(accessToken, deckId, "c1");
      expect(result).toEqual({ success: true });
    });
  });
});

// ---------- PROFILE & UPLOADS ----------

describe("Profile & Upload API", () => {
  const accessToken = "mock_access";

  describe("updateProfile", () => {
    it("updates profile and returns user", async () => {
      const mockUser = { id: "user", displayName: "New Name" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ user: mockUser })
      );

      const result = await api.updateProfile(accessToken, {
        displayName: "New Name",
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("uploadAvatar", () => {
    it("uploads avatar and returns url", async () => {
      const mockUrl = "https://storage/avatar.png";
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ url: mockUrl })
      );

      const file = new File(["avatar"], "avatar.png", { type: "image/png" });
      const result = await api.uploadAvatar(accessToken, file);
      expect(result).toBe(mockUrl);
    });
  });

  describe("uploadCardImage", () => {
    it("uploads card image and returns url", async () => {
      const mockUrl = "https://storage/card.png";
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ url: mockUrl })
      );

      const file = new File(["card"], "card.png", { type: "image/png" });
      const result = await api.uploadCardImage(accessToken, file);
      expect(result).toBe(mockUrl);
    });
  });

  describe("getUserProfile", () => {
    it("fetches user profile", async () => {
      const mockUser = { id: "user", displayName: "Flashy User" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse({ user: mockUser })
      );

      const result = await api.getUserProfile("user");
      expect(result).toEqual(mockUser);
    });
  });
});

// ---------- FRIENDS API ----------

describe("Friends API", () => {
  const accessToken = "mock_access";

  describe("getUserFriends", () => {
    it("returns friends array", async () => {
      const mockFriends = [{ id: "f1", email: "friend@x.com" }];
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify({ friends: mockFriends }))
      );

      const result = await api.getUserFriends(accessToken, "user_123");
      expect(result.friends).toEqual(mockFriends);
    });
  });

  describe("sendFriendRequest", () => {
    it("sends friend request", async () => {
      const responseBody = { message: "Friend request sent" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify(responseBody))
      );

      const result = await api.sendFriendRequest(accessToken, "friend@x.com");
      expect(result).toEqual(responseBody);
    });
  });

  describe("acceptFriendRequest", () => {
    it("accepts friend request", async () => {
      const responseBody = { message: "Friend request accepted" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify(responseBody))
      );

      const result = await api.acceptFriendRequest(accessToken, "friendId");
      expect(result).toEqual(responseBody);
    });
  });

  describe("declineFriendRequest", () => {
    it("declines friend request", async () => {
      const responseBody = { message: "Friend request declined" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify(responseBody))
      );

      const result = await api.declineFriendRequest(accessToken, "friendId");
      expect(result).toEqual(responseBody);
    });
  });

  describe("removeFriend", () => {
    it("removes friend", async () => {
      const responseBody = { message: "Friend removed successfully" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify(responseBody))
      );

      const result = await api.removeFriend(accessToken, "friendId");
      expect(result).toEqual(responseBody);
    });
  });

  describe("getFriendRequests (all)", () => {
    it("returns friend requests data", async () => {
      const responseBody = { incoming: [], outgoing: [] };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createTextResponse(JSON.stringify(responseBody))
      );

      const result = await api.getFriendRequests(accessToken, "user_123");
      expect(result).toEqual(responseBody);
    });
  });
});

// ---------- USER BAN / ADMIN ----------

describe("Admin / Ban API", () => {
  const accessToken = "mock_access";

  describe("banUser", () => {
    it("bans or unbans a user", async () => {
      const responseBody = { success: true };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.banUser(accessToken, "user_abc", true);
      expect(result).toEqual(responseBody);
    });
  });
});

// ---------- COMMUNITY API ----------

describe("Community API", () => {
  const accessToken = "mock_access";

  describe("addDeckFromCommunity", () => {
    it("adds deck from community", async () => {
      const responseBody = { deck: { id: "imported", name: "Shared Deck" } };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.addDeckFromCommunity(accessToken, {
        communityDeckId: "community1",
        name: "Shared Deck",
        color: "#fff",
        emoji: "📚",
        cards: [],
      });
      expect(result).toEqual(responseBody.deck);
    });
  });

  describe("publishDeckToCommunity", () => {
    it("publishes deck to community", async () => {
      const responseBody = { message: "Deck published successfully" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.publishDeckToCommunity(accessToken, {
        deckId: "deck1",
        category: "Language",
        subtopic: "Spanish",
      });
      expect(result).toEqual(responseBody);
    });
  });

  describe("updateCommunityDeck", () => {
    it("updates community deck", async () => {
      const responseBody = { message: "Community deck updated" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.updateCommunityDeck(accessToken, "community1", {
        name: "Updated",
        emoji: "🔥",
        color: "#000",
        cards: [],
      });
      expect(result).toEqual(responseBody);
    });
  });

  describe("deleteCommunityDeck", () => {
    it("deletes community deck", async () => {
      const responseBody = { message: "Deleted" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.deleteCommunityDeck(accessToken, "community1");
      expect(result).toEqual(responseBody);
    });
  });

  describe("toggleCommunityDeckFeatured", () => {
    it("toggles featured status", async () => {
      const responseBody = { deck: { id: "community1", featured: true } };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.toggleCommunityDeckFeatured(
        accessToken,
        "community1"
      );
      expect(result).toEqual(responseBody);
    });
  });

  describe("fetchCommunityDecks", () => {
    it("fetches community decks", async () => {
      const responseBody = { decks: [{ id: "c1" }] };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.fetchCommunityDecks();
      expect(result).toEqual(responseBody.decks);
    });
  });

  describe("fetchFeaturedCommunityDecks", () => {
    it("fetches featured community decks", async () => {
      const responseBody = { decks: [{ id: "c1", featured: true }] };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.fetchFeaturedCommunityDecks();
      expect(result).toEqual(responseBody.decks);
    });
  });

  describe("fetchDownloadCounts", () => {
    it("fetches download counts", async () => {
      const responseBody = { downloads: { d1: 5 } };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.fetchDownloadCounts(["d1"]);
      expect(result).toEqual({ d1: 5 });
    });
  });

  describe("updateImportedDeck", () => {
    it("updates imported deck from community", async () => {
      const responseBody = { deck: { id: "local1", name: "Updated" } };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.updateImportedDeck(accessToken, "local1", {
        name: "Updated",
        color: "#fff",
        emoji: "📚",
        cards: [],
        version: 2,
      });
      expect(result).toEqual(responseBody.deck);
    });
  });
});

// ---------- RATINGS API ----------

describe("Ratings API", () => {
  const accessToken = "mock_access";

  describe("rateDeck", () => {
    it("rates a deck", async () => {
      const responseBody = {
        averageRating: 4.5,
        totalRatings: 10,
        userRating: 5,
      };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.rateDeck(accessToken, "deck1", 5);
      expect(result).toEqual(responseBody);
    });
  });

  describe("getDeckRatings", () => {
    it("gets deck ratings", async () => {
      const responseBody = {
        averageRating: 4.2,
        totalRatings: 3,
        userRating: 4,
      };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.getDeckRatings("deck1", accessToken);
      expect(result).toEqual(responseBody);
    });
  });
});

// ---------- COMMENTS API ----------

describe("Comments API", () => {
  const accessToken = "mock_access";

  describe("getDeckComments", () => {
    it("returns comments for a deck", async () => {
      const responseBody = { comments: [{ id: "c1", text: "Nice deck" }] };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.getDeckComments("deck1");
      expect(result).toEqual(responseBody.comments);
    });
  });

  describe("postDeckComment", () => {
    it("posts a comment and returns it", async () => {
      const responseBody = { comment: { id: "c1", text: "Nice deck" } };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.postDeckComment(
        accessToken,
        "deck1",
        "Nice deck"
      );
      expect(result).toEqual(responseBody.comment);
    });
  });
});

// ---------- NOTIFICATIONS API ----------

describe("Notifications API", () => {
  const accessToken = "mock_access";

  describe("getNotifications", () => {
    it("fetches notifications", async () => {
      const responseBody = { notifications: [{ id: "n1", read: false }] };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.getNotifications(accessToken);
      expect(result).toEqual(responseBody.notifications);
    });
  });

  describe("markNotificationRead", () => {
    it("marks a notification as read", async () => {
      const responseBody = { message: "Notification marked as read" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.markNotificationRead(accessToken, "n1");
      expect(result).toEqual(responseBody);
    });
  });

  describe("clearAllNotifications", () => {
    it("clears all notifications", async () => {
      const responseBody = { message: "All notifications cleared" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.clearAllNotifications(accessToken);
      expect(result).toEqual(responseBody);
    });
  });
});

// ---------- SHARE API ----------

describe("Share API", () => {
  const accessToken = "mock_access";

  describe("createShareLink", () => {
    it("creates a share link", async () => {
      const responseBody = {
        shareId: "share123",
        shareUrl: "/shared/share123",
      };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.createShareLink(accessToken, "deck1", false);
      expect(result).toEqual(responseBody);
    });
  });

  describe("getSharedDeck", () => {
    it("gets a shared deck", async () => {
      const responseBody = {
        sharedDeck: {
          shareId: "share123",
          deckData: { name: "Shared", cards: [] },
        },
      };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.getSharedDeck("share123");
      expect(result).toEqual(responseBody.sharedDeck);
    });
  });
});

// ---------- FLAG / REPORT API ----------

describe("Flag / Report API", () => {
  const accessToken = "mock_access";

  describe("flagCommunityItem", () => {
    it("flags a community item", async () => {
      const responseBody = { message: "Report submitted successfully" };
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce(
        createJsonResponse(responseBody)
      );

      const result = await api.flagCommunityItem(accessToken, {
        itemType: "deck",
        itemId: "deck1",
        reason: "inappropriate",
        details: "Details here",
      });
      expect(result).toEqual(responseBody);
    });
  });
});
