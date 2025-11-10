import { SubscriptionTier } from '../store/useStore'

export const SUBSCRIPTION_LIMITS = {
  free: {
    maxDecks: 15,
    maxCards: 50,
    aiGeneration: false,
    imageOnCards: false,
    importCommunityDecks: false,
    publishToCommunity: false,
  },
  monthly: {
    maxDecks: Infinity,
    maxCards: Infinity,
    aiGeneration: true,
    imageOnCards: true,
    importCommunityDecks: true,
    publishToCommunity: true,
  },
  annual: {
    maxDecks: Infinity,
    maxCards: Infinity,
    aiGeneration: true,
    imageOnCards: true,
    importCommunityDecks: true,
    publishToCommunity: true,
  },
  lifetime: {
    maxDecks: Infinity,
    maxCards: Infinity,
    aiGeneration: true,
    imageOnCards: true,
    importCommunityDecks: true,
    publishToCommunity: true,
  },
}

export const SUBSCRIPTION_PRICES = {
  monthly: { price: 6.99, label: 'Monthly', interval: 'month' },
  annual: { price: 29.99, label: 'Annual', interval: 'year' },
  lifetime: { price: 89.99, label: 'Lifetime', interval: 'once' },
}

// Check if user is the Flashy superuser
export const isSuperuser = (isSuperuser?: boolean): boolean => {
  return isSuperuser === true
}

export const isPremiumUser = (tier?: SubscriptionTier, isSuperuserFlag?: boolean): boolean => {
  // Superusers have all premium features
  if (isSuperuserFlag) return true
  return tier === 'monthly' || tier === 'annual' || tier === 'lifetime'
}

export const canCreateDeck = (currentDeckCount: number, tier?: SubscriptionTier, isSuperuserFlag?: boolean): boolean => {
  // Superusers have unlimited everything
  if (isSuperuserFlag) return true
  const effectiveTier = tier || 'free'
  return currentDeckCount < SUBSCRIPTION_LIMITS[effectiveTier].maxDecks
}

export const canCreateCard = (currentCardCount: number, tier?: SubscriptionTier, isSuperuserFlag?: boolean): boolean => {
  // Superusers have unlimited everything
  if (isSuperuserFlag) return true
  const effectiveTier = tier || 'free'
  return currentCardCount < SUBSCRIPTION_LIMITS[effectiveTier].maxCards
}

export const canUseAI = (tier?: SubscriptionTier, isSuperuserFlag?: boolean): boolean => {
  // Superusers have access to all features
  if (isSuperuserFlag) return true
  const effectiveTier = tier || 'free'
  return SUBSCRIPTION_LIMITS[effectiveTier].aiGeneration
}

export const canAddImageToCard = (tier?: SubscriptionTier, isSuperuserFlag?: boolean): boolean => {
  // Superusers have access to all features
  if (isSuperuserFlag) return true
  const effectiveTier = tier || 'free'
  return SUBSCRIPTION_LIMITS[effectiveTier].imageOnCards
}

export const canImportCommunityDecks = (tier?: SubscriptionTier, isSuperuserFlag?: boolean): boolean => {
  // Superusers have access to all features
  if (isSuperuserFlag) return true
  const effectiveTier = tier || 'free'
  return SUBSCRIPTION_LIMITS[effectiveTier].importCommunityDecks
}

export const canPublishToCommunity = (tier?: SubscriptionTier, isSuperuserFlag?: boolean): boolean => {
  // Superusers have access to all features
  if (isSuperuserFlag) return true
  const effectiveTier = tier || 'free'
  return SUBSCRIPTION_LIMITS[effectiveTier].publishToCommunity
}
