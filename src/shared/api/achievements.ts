import { API_BASE } from "@/supabase/runtime";

// ========================================
// TYPES
// ========================================

export interface UserAchievements {
  unlockedAchievementIds: string[];
  customizedDeckTheme: boolean;
  hasProfilePicture: boolean;
  decksPublished: number;
  decksImported: number;
  studiedBeforeEightAM: boolean;
  studiedAfterMidnight: boolean;
  studiedSixtyMinutesNonstop: boolean;
  studiedThreeHoursInOneDay: boolean;
  flippedCardFiveTimes: boolean;
  studiedOnLowBattery: boolean;
  slowCardReview: boolean;
  createdMultipleChoiceCard: boolean;
  createdTrueFalseCard: boolean;
  createdImageCard: boolean;
  completedBeginnerDeck: boolean;
  completedIntermediateDeck: boolean;
  completedAdvancedDeck: boolean;
  completedExpertDeck: boolean;
  completedMasterDeck: boolean;
  usedAI: boolean;
  aiCardsGenerated: number;
  commentsLeft: number;
  ratingsGiven: number;
  studiedInDarkMode: boolean;
}

// ========================================
// FETCH USER ACHIEVEMENTS
// ========================================

export async function fetchUserAchievements(
  accessToken: string
): Promise<UserAchievements | null> {
  try {
    const response = await fetch(`${API_BASE}/achievements`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("❌ Failed to fetch achievements:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("✅ Fetched achievements from DB:", data.achievements);

    return data.achievements;
  } catch (error) {
    console.error("❌ Error fetching achievements:", error);
    return null;
  }
}
