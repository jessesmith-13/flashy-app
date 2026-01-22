import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'

export function registerCommunityRatingsRoutes(app: Hono) {
  // Rate a deck (premium feature)
  app.post('/community/decks/:communityDeckId/rate', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (!accessToken) {
        console.log('❌ Missing access token')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      
      if (authError || !user) {
        console.log(`❌ Auth error: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Check subscription tier - only non-free users can rate
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()
      
      if (userError) {
        console.log(`❌ Error fetching user data: ${userError.message}`)
        return c.json({ error: 'Failed to verify subscription' }, 500)
      }
      
      const subscriptionTier = userData?.subscription_tier || 'free'
      if (subscriptionTier === 'free') {
        console.log(`❌ User ${user.id} is on free tier, cannot rate decks`)
        return c.json({ error: 'Premium feature: Upgrade to rate decks' }, 403)
      }

      const communityDeckId = c.req.param('communityDeckId')
      const body = await c.req.json()
      const { rating } = body

      if (!rating || rating < 1 || rating > 5) {
        console.log(`❌ Invalid rating: ${rating}`)
        return c.json({ error: 'Rating must be between 1 and 5' }, 400)
      }

      console.log(`⭐ User ${user.id} (${subscriptionTier} tier) rating deck ${communityDeckId} with ${rating} stars`)
      
      // ============================================================
      // SCHEMA-CORRECT: UPSERT rating and calculate statistics
      // ============================================================
      
      const now = new Date().toISOString()
      const ratingId = crypto.randomUUID()
      
      // Upsert user's rating (insert or update if already exists)
      const { error: upsertError } = await supabase
        .from('ratings')  // ← CORRECT TABLE (not 'deck_ratings')
        .upsert({
          id: ratingId,
          community_deck_id: communityDeckId,  // ← CORRECT COLUMN (not 'deck_id')
          user_id: user.id,
          rating: rating,
          created_at: now,
          updated_at: now
        }, {
          onConflict: 'community_deck_id,user_id',  // ← CORRECT COLUMN
          ignoreDuplicates: false
        })
      
      if (upsertError) {
        console.log(`❌ Error upserting rating: ${upsertError.message}`)
        return c.json({ error: 'Failed to save rating' }, 500)
      }
      
      console.log(`✅ Rating saved for deck ${communityDeckId}`)
      
      // Calculate average rating and total ratings for this deck
      const { data: stats, error: statsError } = await supabase
        .from('ratings')  // ← CORRECT TABLE
        .select('rating')
        .eq('community_deck_id', communityDeckId)  // ← CORRECT COLUMN
      
      if (statsError) {
        console.log(`❌ Error fetching rating stats: ${statsError.message}`)
        return c.json({ error: 'Failed to calculate rating statistics' }, 500)
      }
      
      const totalRatings = stats?.length || 0
      const averageRating = totalRatings > 0
        ? stats.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0

      console.log(`✅ Deck ${communityDeckId} now has average rating ${averageRating.toFixed(1)} from ${totalRatings} ratings`)

      // ============================================================
      // 🎯 ACHIEVEMENT TRACKING - RATING ACHIEVEMENTS
      // ============================================================

      let achievementsUnlocked: string[] = []

      try {
        // Count total ratings by this user
        const { count: totalRatings, error: countError } = await supabase
          .from('deck_ratings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if (countError) {
          console.log(`⚠️ Error counting ratings: ${countError.message}`)
        } else {
          console.log(`📊 User ${user.id} now has ${totalRatings || 0} rating(s)`)

          // Get current achievements
          const { data: currentAchievements, error: achievementError } = await supabase
            .from('user_achievements')
            .select('unlocked_achievement_ids')
            .eq('user_id', user.id)
            .single()

          if (achievementError && achievementError.code !== 'PGRST116') {
            console.log(`⚠️ Error fetching achievements: ${achievementError.message}`)
          } else {
            const currentUnlocked = currentAchievements?.unlocked_achievement_ids || []
            const newlyUnlocked: string[] = []

            // Check rating achievements
            if ((totalRatings || 0) >= 10 && !currentUnlocked.includes('fair-critic')) {
              newlyUnlocked.push('fair-critic')  // 10 ratings
            }

            // Update achievements if any unlocked
            if (newlyUnlocked.length > 0) {
              const { error: upsertError } = await supabase
                .from('user_achievements')
                .upsert({
                  user_id: user.id,
                  unlocked_achievement_ids: [...currentUnlocked, ...newlyUnlocked],
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })
              
              if (upsertError) {
                console.log(`❌ Error upserting achievements: ${upsertError.message}`)
              } else {
                console.log(`🎉 User ${user.id} unlocked achievements: ${newlyUnlocked.join(', ')}`)
                achievementsUnlocked = newlyUnlocked
              }

            }

          }
        }
      } catch (achievementTrackingError) {
        console.log(`❌ Achievement tracking error: ${achievementTrackingError}`)
        // Don't fail the whole request if achievement tracking fails
      }

      // ============================================================
      // 🎯 CHECK ACHIEVEMENTS FOR THE DECK OWNER (if 5-star rating)
      // ============================================================

      if (rating === 5) {
        // Get the deck owner
        const { data: deck } = await supabase
          .from('community_decks')
          .select('owner_id')
          .eq('id', communityDeckId)
          .single()

        if (deck?.owner_id) {
          // Count how many 5-star ratings the owner has received across ALL their decks
          const { data: ownerDecks } = await supabase
            .from('community_decks')
            .select('id')
            .eq('owner_id', deck.owner_id)

          if (ownerDecks && ownerDecks.length > 0) {
            const deckIds = ownerDecks.map(d => d.id)
            
            const { count: fiveStarCount, error: fiveStarError } = await supabase
              .from('deck_ratings')
              .select('*', { count: 'exact', head: true })
              .in('community_deck_id', deckIds)
              .eq('rating', 5)

            if (!fiveStarError) {
              console.log(`📊 Deck owner ${deck.owner_id} has ${fiveStarCount || 0} five-star rating(s)`)

              // Get owner's current achievements
              const { data: ownerAchievements, error: ownerAchError } = await supabase
                .from('user_achievements')
                .select('unlocked_achievement_ids')
                .eq('user_id', deck.owner_id)
                .single()

              if (!ownerAchError || ownerAchError.code === 'PGRST116') {
                const ownerUnlocked = ownerAchievements?.unlocked_achievement_ids || []
                
                // Check Five Star Creator achievement
                if ((fiveStarCount || 0) >= 5 && !ownerUnlocked.includes('five-star-creator')) {
                  const { error: ownerUpsertError } = await supabase
                    .from('user_achievements')
                    .upsert({
                      user_id: deck.owner_id,
                      unlocked_achievement_ids: [...ownerUnlocked, 'five-star-creator'],
                      updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' })
                  
                  if (!ownerUpsertError) {
                    console.log(`🎉 Deck owner ${deck.owner_id} unlocked: five-star-creator`)
                  }
                }
              }
            }
          }
        }
      }

      
      return c.json({ 
        message: 'Rating submitted successfully',
        averageRating: Number(averageRating.toFixed(1)),
        totalRatings,
        userRating: rating,
        achievementsUnlocked: achievementsUnlocked || [],
      })
    } catch (error) {
      console.log(`❌ Rate deck exception: ${error}`)
      return c.json({ error: 'Failed to rate deck' }, 500)
    }
  })

  // Get deck ratings
  app.get('/community/decks/:communityDeckId/ratings', async (c: Context) => {
    try {
      const communityDeckId = c.req.param('communityDeckId')
      
      console.log(`📊 Fetching ratings for deck ${communityDeckId}`)
      
      // ============================================================
      // SCHEMA-CORRECT: Query ratings and calculate statistics
      // ============================================================
      
      // Get all ratings for this deck
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')  // ← CORRECT TABLE (not 'deck_ratings')
        .select('rating, user_id')
        .eq('community_deck_id', communityDeckId)  // ← CORRECT COLUMN (not 'deck_id')
      
      if (ratingsError) {
        console.log(`❌ Error fetching ratings: ${ratingsError.message}`)
        return c.json({ error: 'Failed to fetch ratings' }, 500)
      }
      
      const totalRatings = ratings?.length || 0
      const averageRating = totalRatings > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0
      
      console.log(`✅ Deck ${communityDeckId} has ${totalRatings} ratings with average ${averageRating.toFixed(1)}`)
      
      // Check if current user has rated (if authenticated)
      let userRating = null
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      
      if (accessToken) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
        
        if (user && !authError) {
          // Find the user's rating in the results we already fetched
          const userRatingEntry = ratings?.find(r => r.user_id === user.id)
          if (userRatingEntry) {
            userRating = userRatingEntry.rating
            console.log(`✅ User ${user.id} has rated this deck: ${userRating}`)
          }
        }
      }

      return c.json({ 
        averageRating: Number(averageRating.toFixed(1)),
        totalRatings,
        userRating
      })
    } catch (error) {
      console.log(`❌ Get ratings exception: ${error}`)
      return c.json({ error: 'Failed to fetch ratings' }, 500)
    }
  })
}