import type { BetaTaskCategory } from "@/types/betaTesting";
// Complete task definitions for beta testing
export const BETA_TASK_CATEGORIES: BetaTaskCategory[] = [
  {
    id: "getting-started",
    title: "🚀 Getting Started",
    description: "Basic account setup and navigation",
    icon: "Rocket",
    tasks: [
      {
        id: "signup",
        label: "Sign up for a new account",
        autoCheckCondition: "Automatically checked when account is created",
      },
      {
        id: "login",
        label: "Log out and log back in",
        description: "Test the authentication flow",
      },
      {
        id: "profile-view",
        label: "View your profile page",
        navigateTo: "/profile",
      },
      {
        id: "dark-mode",
        label: "Toggle dark mode on/off",
        description: "Check if it works smoothly",
        navigateTo: "/settings",
      },
    ],
  },
  {
    id: "decks",
    title: "📚 Creating & Managing Decks",
    description: "Test deck creation and management",
    icon: "BookOpen",
    tasks: [
      {
        id: "create-deck",
        label: "Create a new deck",
        autoCheckCondition: "Auto-completes when you create your first deck",
        navigateTo: "/decks",
      },
      {
        id: "edit-deck",
        label: "Edit a deck's name or description",
        description: "Try updating deck details",
      },
      {
        id: "set-languages",
        label: "Set front and back languages for a deck",
        description: "Test the language selector",
      },
      {
        id: "delete-deck",
        label: "Delete a deck",
        description: "Make sure it actually disappears",
      },
    ],
  },
  {
    id: "cards",
    title: "🃏 Adding Cards",
    description: "Test all card types and editing",
    icon: "CreditCard",
    tasks: [
      {
        id: "add-classic-flip",
        label: "Add a Classic Flip card",
        description: "Question on front, answer on back",
      },
      {
        id: "add-multiple-choice",
        label: "Add a Multiple Choice card",
        description: "Try adding multiple correct answers",
      },
      {
        id: "add-type-answer",
        label: "Add a Type-to-Answer card",
        description: "Include alternative accepted answers",
      },
      {
        id: "edit-card",
        label: "Edit a card after creating it",
        description: "Change front/back text or card type",
      },
      {
        id: "delete-card",
        label: "Delete a card",
        description: "Verify it's removed from the deck",
      },
      {
        id: "add-image-card",
        label: "Add an image to a card (Premium)",
        description: "Test image upload on front or back",
      },
      {
        id: "add-audio-card",
        label: "Add audio to a card (Premium)",
        description: "Record or upload audio",
      },
    ],
  },
  {
    id: "subscription",
    title: "💳 Subscription & Payments",
    description: "Test payment and subscription features",
    icon: "CreditCard",
    tasks: [
      {
        id: "view-plans",
        label: "View subscription plans",
        navigateTo: "/settings",
      },
      {
        id: "check-features",
        label: "Check what each tier includes",
        description: `Click "Upgrade" to compare free, premium, and lifetime`,
      },
      {
        id: "upgrade-flow",
        label: "Try the upgrade flow (don't complete payment)",
        description:
          "Test the Stripe checkout process, use 4242 4242 4242 4242 for a test card (It's just on test mode!)",
      },
      {
        id: "check-subscription-status",
        label: "View your subscription status after upgrading",
        navigateTo: "/settings",
      },
    ],
  },
  {
    id: "study",
    title: "🎯 Studying Your Cards",
    description: "Test study sessions and progress tracking",
    icon: "GraduationCap",
    tasks: [
      {
        id: "start-study",
        label: "Start a study session",
        autoCheckCondition: "Auto-completes on first study session",
        navigateTo: "/all-cards",
      },
      {
        id: "classic-flip-study",
        label: "Study with Classic Flip cards",
        description: "Rate cards with ✓ or ✗",
      },
      {
        id: "multiple-choice-study",
        label: "Study with Multiple Choice cards",
        description: "Select and submit answers",
      },
      {
        id: "type-answer-study",
        label: "Study with Type-to-Answer cards",
        description: "Type your answer and check correctness",
      },
      {
        id: "complete-session",
        label: "Complete a full study session",
        description: "Finish studying a deck and see results",
      },
      {
        id: "check-progress",
        label: "Check deck progress stats",
        description: "View % mastered and other metrics",
      },
    ],
  },
  {
    id: "achievements",
    title: "🏆 Achievements & Gamification",
    description: "Test the achievement system",
    icon: "Trophy",
    tasks: [
      {
        id: "view-achievements",
        label: "View the Achievements page",
        navigateTo: "/profile/?tab=achievements",
      },
      {
        id: "unlock-achievement",
        label: "Unlock an achievement",
        description: "Try creating 5 cards, studying for 3 days, etc.",
      },
      {
        id: "check-streak",
        label: "Check your current streak",
        description: "View it on your profile page",
      },
    ],
  },
  {
    id: "friends",
    title: "👥 Friends & Social Features",
    description: "Test the friends system",
    icon: "Users",
    tasks: [
      {
        id: "add-friend",
        label: "Send a friend request to Flashy",
        description: "Visit Flashy's profile and send a friend request!",
        navigateToUser: import.meta.env.VITE_FLASHY_USER_ID,
      },
      {
        id: "accept-friend",
        label: "Accept a friend request",
        description: "You'll need someone to send you one",
      },
      {
        id: "view-friend-profile",
        label: "View a friend's profile",
        description: "Check their stats and achievements",
      },
      {
        id: "remove-friend",
        label: "Remove a friend",
        description: "Test unfriending functionality",
      },
    ],
  },
  {
    id: "community",
    title: "🌍 Community Decks",
    description: "Test community features",
    icon: "Globe",
    tasks: [
      {
        id: "browse-community",
        label: "Browse community decks",
        navigateTo: "/community",
      },
      {
        id: "search-community",
        label: "Search for decks by topic",
        description: 'Try searching for "Spanish", "Science", etc.',
      },
      {
        id: "filter-community",
        label: "Filter by category or language",
        description: "Use the filter options",
      },
      {
        id: "view-community-deck",
        label: "View a community deck's details",
        description: "See cards, ratings, comments",
      },
      {
        id: "copy-community-deck",
        label: "Import a community deck to your library",
        description: `Hit the "Add to My Decks" button`,
      },
      {
        id: "publish-deck",
        label: "Publish your own deck to community",
        description: "Make one of your decks public",
      },
      {
        id: "unpublish-deck",
        label: "Unpublish a deck",
        description: "Make it private again",
      },
      {
        id: "rate-deck",
        label: "Rate a community deck",
        description: "Give it 1-5 stars",
      },
      {
        id: "comment-deck",
        label: "Leave a comment on a deck",
        description: "Test the comment feature",
      },
      {
        id: "flag-content",
        label: "Flag inappropriate content",
        description: "Test the flagging system",
      },
    ],
  },
  {
    id: "ai-features",
    title: "🤖 AI Features (Premium)",
    description: "Test AI-powered features",
    icon: "Sparkles",
    tasks: [
      {
        id: "ai-generate",
        label: "Generate cards with AI",
        description: "Use AI to create a deck on any topic",
      },
      {
        id: "ai-chat",
        label: "Use AI chat assistant",
        description: "Ask AI for help creating cards",
      },
      {
        id: "ai-translate-front",
        label: "Translate card front with AI",
        description: "Use the translate button",
      },
      {
        id: "ai-translate-back",
        label: "Translate card back with AI",
        description: "Test translation accuracy",
      },
      {
        id: "ai-cross-language",
        label: "Test cross-language AI generation",
        description: "E.g., French questions with English answers",
      },
    ],
  },
  {
    id: "settings",
    title: "⚙️ Settings & Preferences",
    description: "Test app settings",
    icon: "Settings",
    tasks: [
      {
        id: "email-preferences",
        label: "Toggle email notification preferences",
        navigateTo: "/settings",
      },
      {
        id: "update-profile",
        label: "Update display name or bio",
        description: "Change your profile info",
      },
      {
        id: "settings-persist",
        label: "Verify settings persist after refresh",
        description: "Reload the page and check",
      },
    ],
  },
  {
    id: "mobile",
    title: "📱 Mobile Experience",
    description: "Test on mobile devices",
    icon: "Smartphone",
    tasks: [
      {
        id: "mobile-responsive",
        label: "Check if app fits your mobile screen",
        description: "Test on your phone",
      },
      {
        id: "mobile-study",
        label: "Study cards on mobile",
        description: "Make sure cards are easy to read/interact with",
      },
      {
        id: "mobile-buttons",
        label: "Tap buttons and links",
        description: "Ensure they're big enough and work",
      },
      {
        id: "mobile-rotate",
        label: "Rotate phone (landscape vs portrait)",
        description: "Check both orientations",
      },
      {
        id: "mobile-nav",
        label: "Test bottom navigation on mobile",
        description: `Hit "More" to pop up the menu and Navigate between screens`,
      },
    ],
  },
];

// Helper function to get all task IDs (useful for initialization)
export const getAllTaskIds = (): string[] => {
  return BETA_TASK_CATEGORIES.flatMap((category) =>
    category.tasks.map((task) => task.id)
  );
};

// Helper function to count total tasks
export const getTotalTaskCount = (): number => {
  return BETA_TASK_CATEGORIES.reduce(
    (total, category) => total + category.tasks.length,
    0
  );
};
