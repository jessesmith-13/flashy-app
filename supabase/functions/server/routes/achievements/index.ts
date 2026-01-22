import type { Context, Hono } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'

export function registerAchievementsRoutes(app: Hono) {
  // ============================================================
  // GET /achievements — Fetch user achievements
  // ============================================================
  app.get('/achievements', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // ✅ Read from actual database columns
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching achievements:', error)
        return c.json({ error: 'Failed to fetch achievements' }, 500)
      }

      // ✅ If no record exists, return defaults
      if (!data) {
        return c.json({ 
          achievements: {
            unlockedAchievementIds: [],
            customizedDeckTheme: false,
            hasProfilePicture: false,
            decksPublished: 0,
            decksImported: 0,
            studiedBeforeEightAM: false,
            studiedAfterMidnight: false,
            studiedSixtyMinutesNonstop: false,
            studiedThreeHoursInOneDay: false,
            flippedCardFiveTimes: false,
            studiedOnLowBattery: false,
            slowCardReview: false,
            createdMultipleChoiceCard: false,
            createdTrueFalseCard: false,
            createdImageCard: false,
            completedBeginnerDeck: false,
            completedIntermediateDeck: false,
            completedAdvancedDeck: false,
            completedExpertDeck: false,
            completedMasterDeck: false,
            usedAI: false,
            aiCardsGenerated: 0,
            commentsLeft: 0,
            ratingsGiven: 0,
          }
        })
      }

      // ✅ Map database columns to frontend format
      return c.json({ 
        achievements: {
          unlockedAchievementIds: data.unlocked_achievement_ids || [],
          customizedDeckTheme: data.customized_deck_theme || false,
          hasProfilePicture: data.has_profile_picture || false,
          decksPublished: data.decks_published || 0,
          decksImported: data.decks_imported || 0,
          studiedBeforeEightAM: data.studied_before_eight_am || false,
          studiedAfterMidnight: data.studied_after_midnight || false,
          studiedSixtyMinutesNonstop: data.studied_sixty_minutes_nonstop || false,
          studiedThreeHoursInOneDay: data.studied_three_hours_in_one_day || false,
          flippedCardFiveTimes: data.flipped_card_five_times || false,
          studiedOnLowBattery: data.studied_on_low_battery || false,
          slowCardReview: data.slow_card_review || false,
          createdMultipleChoiceCard: data.created_multiple_choice_card || false,
          createdTrueFalseCard: data.created_true_false_card || false,
          createdImageCard: data.created_image_card || false,
          completedBeginnerDeck: data.completed_beginner_deck || false,
          completedIntermediateDeck: data.completed_intermediate_deck || false,
          completedAdvancedDeck: data.completed_advanced_deck || false,
          completedExpertDeck: data.completed_expert_deck || false,
          completedMasterDeck: data.completed_master_deck || false,
          usedAI: data.used_ai || false,
          aiCardsGenerated: data.ai_cards_generated || 0,
          commentsLeft: data.comments_left || 0,
          ratingsGiven: data.ratings_given || 0,
        }
      })
    } catch (err) {
      console.error('Get achievements error:', err)
      return c.json({ error: 'Failed to fetch achievements' }, 500)
    }
  })

  // ============================================================
  // POST /achievements — Manually unlock achievement (DEPRECATED - use specific endpoints instead)
  // ============================================================
  app.post('/achievements', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const body = await c.req.json()

      // ⚠️ This endpoint is mostly deprecated now
      // Study sessions auto-track achievements
      // Keep this for manual actions like profile picture upload, deck publishing, etc.

      console.log('⚠️ POST /achievements called with body:', body)
      console.log('⚠️ This endpoint is deprecated - most achievements are auto-tracked')

      return c.json({ 
        message: 'Achievement tracking has been moved to specific action endpoints',
        deprecated: true 
      })
    } catch (err) {
      console.error('Post achievements error:', err)
      return c.json({ error: 'Failed to save achievements' }, 500)
    }
  })
}