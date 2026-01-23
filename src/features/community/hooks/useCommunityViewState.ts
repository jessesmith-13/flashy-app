import { useEffect, useState } from "react";
import type { UICommunityCard, UICommunityDeck } from "@/types/community";

type ViewUserProfileDetail = { userId?: string };
type ViewUserProfileEvent = CustomEvent<ViewUserProfileDetail>;

type ReturnToUserDeck = {
  deck: UICommunityDeck;
  cards: UICommunityCard[];
  ownerId: string;
};

export function useCommunityViewState(args: {
  // store-driven
  returnToCommunityDeck: UICommunityDeck | null;
  returnToUserDeck: ReturnToUserDeck | null;

  viewingCommunityDeckId: string | null;
  setViewingCommunityDeckId: (id: string | null) => void;
  viewingUserId: string | null;
  setViewingUserId: (id: string | null) => void;

  // decks
  communityDecks: UICommunityDeck[];
  loading: boolean;
  fetchDeckById: (id: string) => Promise<UICommunityDeck | null>;

  // card navigation
  targetCardIndex: number | null;
}) {
  const {
    returnToCommunityDeck,
    returnToUserDeck,
    viewingCommunityDeckId,
    setViewingCommunityDeckId,
    viewingUserId,
    setViewingUserId,
    communityDecks,
    loading,
    fetchDeckById,
    targetCardIndex,
  } = args;

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [viewingUserDeck, setViewingUserDeck] =
    useState<ReturnToUserDeck | null>(null);

  const [viewingDeck, setViewingDeck] = useState<UICommunityDeck | null>(null);

  const [deckDetailPage, setDeckDetailPage] = useState(1);

  // Restore viewing deck when returning from study
  useEffect(() => {
    if (returnToCommunityDeck) setViewingDeck(returnToCommunityDeck);
    if (returnToUserDeck) setViewingUserDeck(returnToUserDeck);
  }, [returnToCommunityDeck, returnToUserDeck]);

  // Reset deck detail page when viewing a new deck (unless navigating to a specific card)
  useEffect(() => {
    if (!targetCardIndex) setDeckDetailPage(1);
  }, [viewingDeck?.id, targetCardIndex]);

  // Listen for custom event to view user profile
  useEffect(() => {
    const handleViewUserProfile = (event: Event) => {
      const custom = event as ViewUserProfileEvent;
      const userId = custom.detail?.userId;
      if (userId) setSelectedUserId(userId);
    };

    window.addEventListener("viewUserProfile", handleViewUserProfile);
    return () =>
      window.removeEventListener("viewUserProfile", handleViewUserProfile);
  }, []);

  // Watch for viewingUserId from store
  useEffect(() => {
    if (viewingUserId) {
      setSelectedUserId(viewingUserId);
      setViewingUserId(null);
    }
  }, [viewingUserId, setViewingUserId]);

  // Notification-triggered deck viewing
  useEffect(() => {
    if (viewingCommunityDeckId && !loading) {
      const deckToView = communityDecks.find(
        (d) => d.id === viewingCommunityDeckId,
      );

      if (deckToView) {
        setViewingDeck(deckToView);
        setViewingCommunityDeckId(null);
      } else {
        void fetchDeckById(viewingCommunityDeckId).then((deck) => {
          if (deck) setViewingDeck(deck);
          setViewingCommunityDeckId(null);
        });
      }
    }
  }, [
    viewingCommunityDeckId,
    loading,
    communityDecks,
    fetchDeckById,
    setViewingCommunityDeckId,
  ]);

  return {
    selectedUserId,
    setSelectedUserId,

    viewingUserDeck,
    setViewingUserDeck,

    viewingDeck,
    setViewingDeck,

    deckDetailPage,
    setDeckDetailPage,
  };
}
