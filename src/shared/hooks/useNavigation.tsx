import { useNavigate } from "react-router-dom";
import { useStore } from "@/shared/state/useStore";

// Map old view names to new routes
const viewToRoute: Record<string, string> = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  decks: "/decks",
  "deck-detail": "/deck-detail", // needs selectedDeckId
  study: "/study", // needs selectedDeckId
  "study-options": "/study-options", // needs selectedDeckId
  community: "/community",

  // ✅ NEW PAGE — community deck detail
  "community-deck-detail": "/community/deck",

  profile: "/profile",
  "ai-generate": "/ai-generate",
  upgrade: "/upgrade",
  "all-cards": "/all-cards",
  settings: "/settings",
  superuser: "/superuser",
  moderator: "/moderator",
  "beta-testing": "/beta-testing",
  privacy: "/privacy",
  terms: "/terms",
  contact: "/contact",
  notifications: "/notifications",
};

export function useNavigation() {
  const navigate = useNavigate();
  const { selectedDeckId } = useStore();

  const navigateTo = (
    view: keyof typeof viewToRoute,
    options?: {
      skipDeckIdCheck?: boolean;
      deckId?: string; // ✅ only used for community deck detail
    },
  ) => {
    const route = viewToRoute[view];

    // Existing personal-deck routes (UNCHANGED)
    if (
      view === "deck-detail" ||
      view === "study" ||
      view === "study-options"
    ) {
      if (options?.skipDeckIdCheck) {
        navigate(route);
      } else if (selectedDeckId) {
        navigate(`${route}/${selectedDeckId}`);
      } else {
        if (view === "study") {
          navigate(route);
        } else {
          console.warn(
            `Attempted to navigate to ${view} without selectedDeckId`,
          );
          navigate("/decks");
        }
      }
      return;
    }

    // ✅ Community deck detail (explicit deckId, NOT selectedDeckId)
    if (view === "community-deck-detail") {
      if (!options?.deckId) {
        console.warn("Missing deckId for community-deck-detail");
        return;
      }
      navigate(`${route}/${options.deckId}`);
      return;
    }

    // Everything else (UNCHANGED)
    navigate(route);
  };

  return { navigateTo, navigate };
}
