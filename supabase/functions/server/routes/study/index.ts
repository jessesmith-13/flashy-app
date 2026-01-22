import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'

// ========================================
// ACHIEVEMENT TYPES & HELPERS
// ========================================

interface AchievementUpdate {
  id: string
  icon: string
  title: string
  description: string
}

// ========================================
// ACHIEVEMENT CHECKING LOGIC
// ========================================

function checkAchievements(stats: any): AchievementUpdate[] {
  const newAchievements: AchievementUpdate[] = []
  const unlocked = stats.unlocked_achievement_ids || []

  // Helper to check if already unlocked
  const isUnlocked = (id: string) => unlocked.includes(id)
  const unlock = (id: string, icon: string, title: string, description: string) => {
    if (!isUnlocked(id)) {
      newAchievements.push({ id, icon, title, description })
    }
  }

  // ========== GETTING STARTED ==========
  if (stats.total_study_sessions >= 1) {
    unlock('first-study', '📖', 'First Study Session', 'Complete your first study session')
  }
  if (stats.cards_reviewed >= 10) {
    unlock('memory-spark', '✨', 'Memory Spark', 'Review your first 10 cards')
  }

  // ========== STUDY STREAKS ==========
  if (stats.study_streak >= 3) {
    unlock('on-a-roll', '🔥', 'On a Roll', 'Study 3 days in a row')
  }
  if (stats.study_streak >= 7) {
    unlock('week-warrior', '⚡', 'Week Warrior', 'Study 7 days in a row')
  }
  if (stats.study_streak >= 14) {
    unlock('unstoppable', '💪', 'Unstoppable', 'Maintain a 14-day study streak')
  }
  if (stats.study_streak >= 30) {
    unlock('dedication', '📅', 'Dedication', 'Maintain a 30-day study streak')
  }
  if (stats.study_streak >= 100) {
    unlock('legendary-streak', '🏆', 'Legendary Streak', 'Study every day for 100 days')
  }
  if (stats.studied_before_eight_am) {
    unlock('early-bird', '🌅', 'Early Bird', 'Study before 8 AM')
  }
  if (stats.studied_after_midnight) {
    unlock('night-owl', '🦉', 'Night Owl', 'Study between midnight and 3 AM')
  }

  // ========== STUDY MASTERY ==========
  if (stats.perfect_scores >= 1) {
    unlock('perfect-score', '💯', 'Perfect Score', 'Get every card correct in a study session')
  }
  if (stats.perfect_scores >= 5) {
    unlock('ace-student', '🎓', 'Ace Student', 'Achieve 5 perfect scores')
  }
  if (stats.cards_reviewed >= 100) {
    unlock('hundred-cards', '🎯', 'Century Reviewer', 'Review 100 cards total')
  }
  if (stats.cards_reviewed >= 500) {
    unlock('five-hundred-cards', '🏅', 'Knowledge Seeker', 'Review 500 cards total')
  }
  if (stats.cards_reviewed >= 1000) {
    unlock('thousand-cards', '🌟', 'Master Learner', 'Review 1,000 cards total')
  }
  if (stats.cards_reviewed >= 100 && (stats.average_accuracy || 0) >= 90) {
    unlock('accuracy-expert', '🎖️', 'Accuracy Expert', 'Maintain 90%+ accuracy over 100 cards')
  }
  if ((stats.correct_answers_in_row || 0) >= 20) {
    unlock('quick-learner', '💡', 'Quick Learner', 'Get 20 cards correct in a row')
  }
  if ((stats.correct_answers_in_row || 0) >= 50) {
    unlock('unstoppable-genius', '🧠', 'Unstoppable Genius', 'Get 50 cards correct in a row')
  }
  if (stats.studied_sixty_minutes_nonstop) {
    unlock('marathon-session', '🏃', 'Marathon Session', 'Study for 60+ minutes without stopping')
  }
  if (stats.studied_three_hours_in_one_day) {
    unlock('ultra-marathon', '🚀', 'Ultra Marathon', 'Study for 3+ hours in one day')
  }
  if (stats.completed_beginner_deck) {
    unlock('beginner-master', '🟢', 'Beginner Master', 'Complete a beginner difficulty deck')
  }
  if (stats.completed_intermediate_deck) {
    unlock('intermediate-master', '🟡', 'Intermediate Master', 'Complete an intermediate difficulty deck')
  }
  if (stats.completed_advanced_deck) {
    unlock('advanced-master', '🟠', 'Advanced Master', 'Complete an advanced difficulty deck')
  }
  if (stats.completed_expert_deck) {
    unlock('expert-master', '🔴', 'Expert Master', 'Complete an expert difficulty deck')
  }
  if (stats.completed_master_deck) {
    unlock('ultimate-master', '🌈', 'Ultimate Master', 'Complete a master difficulty deck')
  }

  // ========== HIDDEN / FUN ==========
  if (stats.slow_card_review) {
    unlock('slow-and-steady', '🐢', 'Slow and Steady', 'Take over 10 minutes to review one card')
  }
  if (stats.studied_on_low_battery) {
    unlock('dedication-mode', '🔋', 'Dedication Mode', 'Study while your battery is below 5%')
  }

  // ========== META ACHIEVEMENTS ==========
  const currentUnlockedCount = unlocked.length + newAchievements.length
  if (currentUnlockedCount >= 20 && !isUnlocked('achievement-hunter')) {
    unlock('achievement-hunter', '🏆', 'Achievement Hunter', 'Unlock 20 achievements')
  }
  if (currentUnlockedCount >= 50 && !isUnlocked('completionist')) {
    unlock('completionist', '💎', 'Completionist', 'Unlock 50 achievements')
  }

  return newAchievements
}

// ========================================
// CALCULATE STUDY STREAK
// ========================================

async function calculateStudyStreak(userId: string, currentSessionDate: Date): Promise<number> {
  // Get all study sessions ordered by date
  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('date, started_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error || !sessions || sessions.length === 0) {
    return 1 // First session = 1 day streak
  }

  // Get unique study dates (ignore time, just look at calendar days)
  const uniqueDates = new Set<string>()
  sessions.forEach(session => {
    const sessionDate = new Date(session.date || session.started_at)
    const dateStr = sessionDate.toISOString().split('T')[0] // YYYY-MM-DD
    uniqueDates.add(dateStr)
  })

  // Add current session date
  const todayStr = currentSessionDate.toISOString().split('T')[0]
  uniqueDates.add(todayStr)

  // Convert to sorted array (newest first)
  const sortedDates = Array.from(uniqueDates).sort().reverse()

  // Count consecutive days
  let streak = 0
  let expectedDate = new Date(sortedDates[0])

  for (const dateStr of sortedDates) {
    const currentDate = new Date(dateStr)
    const expectedDateStr = expectedDate.toISOString().split('T')[0]

    if (dateStr === expectedDateStr) {
      streak++
      // Move expected date back one day
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else {
      // Streak broken
      break
    }
  }

  return streak
}

// ========================================
// CHECK IF STUDIED 3+ HOURS TODAY
// ========================================

async function checkStudiedThreeHoursToday(userId: string, additionalSeconds: number): Promise<boolean> {
  const todayStr = new Date().toISOString().split('T')[0]
  
  // Get all study sessions from today
  const { data: todaySessions, error } = await supabase
    .from('study_sessions')
    .select('time_spent_seconds')
    .eq('user_id', userId)
    .gte('started_at', `${todayStr}T00:00:00Z`)
    .lt('started_at', `${todayStr}T23:59:59Z`)

  if (error || !todaySessions) {
    return additionalSeconds >= 10800 // 3 hours in seconds
  }

  const totalSecondsToday = todaySessions.reduce(
    (sum, session) => sum + (session.time_spent_seconds || 0),
    0
  ) + additionalSeconds

  return totalSecondsToday >= 10800 // 3 hours = 10800 seconds
}

// ========================================
// UPDATE ACHIEVEMENT STATS
// ========================================

async function updateAchievementStats(
  userId: string,
  sessionData: {
    cardsStudied: number
    correctCount: number
    incorrectCount: number
    timeSpentSeconds: number
    score: number
    startedAt: Date
    deckDifficulty?: string
    lowBattery?: boolean
  }
): Promise<{ stats: any; newAchievements: AchievementUpdate[] }> {
  // 1. Get current achievement stats
  const { data: currentStats, error: statsError } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (statsError && statsError.code !== 'PGRST116') {
    console.error('Error fetching achievement stats:', statsError)
    throw new Error('Failed to fetch achievement stats')
  }

  // If no stats exist, create initial record
  if (!currentStats) {
    const { data: newStats, error: createError } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        unlocked_achievement_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating achievement stats:', createError)
      throw new Error('Failed to create achievement stats')
    }

    return updateAchievementStats(userId, sessionData) // Retry with new record
  }

  // 2. Calculate updated stats
  const totalStudySessions = (currentStats.total_study_sessions || 0) + 1
  const cardsReviewed = (currentStats.cards_reviewed || 0) + sessionData.cardsStudied
  const totalStudyMinutes = Math.floor(
    ((currentStats.total_study_minutes || 0) * 60 + sessionData.timeSpentSeconds) / 60
  )

  // Calculate average accuracy
  const previousCorrect = currentStats.cards_reviewed || 0
  const previousAccuracy = currentStats.average_accuracy || 0
  const totalPreviousCorrect = Math.round((previousCorrect * previousAccuracy) / 100)
  const totalCorrect = totalPreviousCorrect + sessionData.correctCount
  const averageAccuracy = cardsReviewed > 0 ? Math.round((totalCorrect / cardsReviewed) * 100) : 0

  // Perfect score check
  const isPerfectScore =
    sessionData.cardsStudied > 0 &&
    sessionData.correctCount === sessionData.cardsStudied &&
    sessionData.incorrectCount === 0
  const perfectScores = (currentStats.perfect_scores || 0) + (isPerfectScore ? 1 : 0)

  // Correct answers in a row tracking
  let correctAnswersInRow = currentStats.correct_answers_in_row || 0
  if (sessionData.incorrectCount > 0) {
    correctAnswersInRow = 0
  } else {
    correctAnswersInRow += sessionData.correctCount
  }

  // Study time checks
  const hour = sessionData.startedAt.getHours()
  const studiedBeforeEightAM = currentStats.studied_before_eight_am || hour < 8
  const studiedAfterMidnight = currentStats.studied_after_midnight || (hour >= 0 && hour < 3)
  const studiedSixtyMinutesNonstop =
    currentStats.studied_sixty_minutes_nonstop || sessionData.timeSpentSeconds >= 3600

  // ✅ Check 3+ hours today by querying study_sessions table
  const studiedThreeHoursInOneDay = 
    currentStats.studied_three_hours_in_one_day || 
    await checkStudiedThreeHoursToday(userId, sessionData.timeSpentSeconds)

  // ✅ Battery check from session data (sent by client)
  const studiedOnLowBattery = currentStats.studied_on_low_battery || sessionData.lowBattery === true

  // Slow card review check
  const avgTimePerCard = sessionData.cardsStudied > 0 ? sessionData.timeSpentSeconds / sessionData.cardsStudied : 0
  const slowCardReview = currentStats.slow_card_review || avgTimePerCard > 600 // 10 minutes per card

  // Difficulty completion tracking
  const completedBeginnerDeck = currentStats.completed_beginner_deck || sessionData.deckDifficulty === 'beginner'
  const completedIntermediateDeck = currentStats.completed_intermediate_deck || sessionData.deckDifficulty === 'intermediate'
  const completedAdvancedDeck = currentStats.completed_advanced_deck || sessionData.deckDifficulty === 'advanced'
  const completedExpertDeck = currentStats.completed_expert_deck || sessionData.deckDifficulty === 'expert'
  const completedMasterDeck = currentStats.completed_master_deck || sessionData.deckDifficulty === 'master'

  // Calculate study streak
  const studyStreak = await calculateStudyStreak(userId, sessionData.startedAt)

  // 3. ✅ Build update object (NO MORE JSONB!)
  const updates = {
    total_study_sessions: totalStudySessions,
    cards_reviewed: cardsReviewed,
    average_accuracy: averageAccuracy,
    perfect_scores: perfectScores,
    total_study_minutes: totalStudyMinutes,
    study_streak: studyStreak,
    studied_before_eight_am: studiedBeforeEightAM,
    studied_after_midnight: studiedAfterMidnight,
    studied_sixty_minutes_nonstop: studiedSixtyMinutesNonstop,
    studied_three_hours_in_one_day: studiedThreeHoursInOneDay,
    studied_on_low_battery: studiedOnLowBattery,
    slow_card_review: slowCardReview,
    completed_beginner_deck: completedBeginnerDeck,
    completed_intermediate_deck: completedIntermediateDeck,
    completed_advanced_deck: completedAdvancedDeck,
    completed_expert_deck: completedExpertDeck,
    completed_master_deck: completedMasterDeck,
    correct_answers_in_row: correctAnswersInRow,
    updated_at: new Date().toISOString(),
  }

  // 4. Update database
  const { data: updatedStats, error: updateError } = await supabase
    .from('user_achievements')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating achievement stats:', updateError)
    throw new Error('Failed to update achievement stats')
  }

  // 5. Check for new achievements
  const newAchievements = checkAchievements(updatedStats)

  // 6. If new achievements, update unlocked_achievements array
  if (newAchievements.length > 0) {
    const newUnlockedIds = newAchievements.map(a => a.id)
    const allUnlockedIds = [...(updatedStats.unlocked_achievement_ids || []), ...newUnlockedIds]

    await supabase
      .from('user_achievements')
      .update({
        unlocked_achievement_ids: allUnlockedIds,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    console.log(`🎉 User ${userId} unlocked ${newAchievements.length} new achievements:`, newUnlockedIds)
  }

  return { stats: updatedStats, newAchievements }
}

// ========================================
// ROUTE REGISTRATION
// ========================================

export function registerStudyRoutes(app: Hono) {
  // ============================================================
  // Save study session (WITH ACHIEVEMENT TRACKING)
  // ============================================================
  app.post('/study/sessions', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]
      if (!accessToken) {
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const body = await c.req.json()

      // RAW incoming session (keep this)
      const sessionData = body.session || body

      const sessionId = sessionData.id || crypto.randomUUID()
      const deckId = sessionData.deckId || sessionData.deck_id

      if (!deckId) {
        return c.json({ error: 'deckId is required' }, 400)
      }

      const now = new Date().toISOString()
      const startedAt = sessionData.startedAt || sessionData.started_at || now

      // ✅ SAFE normalized payload (store this)
      const safeSessionData = {
        cardsStudied: sessionData.cardsStudied ?? sessionData.cards_studied ?? 0,
        correctCount: sessionData.correctCount ?? sessionData.correct_count ?? 0,
        incorrectCount: sessionData.incorrectCount ?? sessionData.incorrect_count ?? 0,
        skippedCount: sessionData.skippedCount ?? sessionData.skipped_count ?? 0,
        mode:
          sessionData.mode ??
          sessionData.studyMode ??
          sessionData.study_mode ??
          'review',
        timeSpentSeconds:
          sessionData.timeSpentSeconds ??
          sessionData.time_spent_seconds ??
          0,
        score: sessionData.score ?? 0,
        lowBattery: sessionData.lowBattery ?? false, // ✅ Pass through low battery flag
      }

      const dbSessionData = {
        id: sessionId,
        user_id: user.id,
        deck_id: deckId,
        date: sessionData.date ?? now,
        started_at: startedAt,
        ended_at: sessionData.endedAt ?? sessionData.ended_at ?? null,
        cards_studied: safeSessionData.cardsStudied,
        correct_count: safeSessionData.correctCount,
        incorrect_count: safeSessionData.incorrectCount,
        skipped_count: safeSessionData.skippedCount,
        score: safeSessionData.score,
        study_mode: safeSessionData.mode,
        time_spent_seconds: safeSessionData.timeSpentSeconds,
        session_data: safeSessionData,
        updated_at: now,
      }

      // 1. Save study session to database
      const { data: savedSession, error: sessionError } = await supabase
        .from('study_sessions')
        .upsert(dbSessionData, { onConflict: 'id' })
        .select()
        .single()

      if (sessionError) {
        console.error('DB error saving study session:', sessionError)
        return c.json({ error: 'Failed to save study session' }, 500)
      }

      // 2. Get deck difficulty for achievement tracking
      const { data: deck } = await supabase
        .from('decks')
        .select('difficulty')
        .eq('id', deckId)
        .single()

      // 3. Update achievement stats
      try {
        const { stats, newAchievements } = await updateAchievementStats(user.id, {
          cardsStudied: safeSessionData.cardsStudied,
          correctCount: safeSessionData.correctCount,
          incorrectCount: safeSessionData.incorrectCount,
          timeSpentSeconds: safeSessionData.timeSpentSeconds,
          score: safeSessionData.score,
          startedAt: new Date(startedAt),
          deckDifficulty: deck?.difficulty,
          lowBattery: safeSessionData.lowBattery, // ✅ Pass through
        })

        return c.json({
          success: true,
          session: savedSession,
          newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
          achievementStats: {
            studyStreak: stats.study_streak,
            totalSessions: stats.total_study_sessions,
            cardsReviewed: stats.cards_reviewed,
            perfectScores: stats.perfect_scores,
          },
        })
      } catch (achievementError) {
        console.error('Error updating achievements (non-critical):', achievementError)
        // Don't fail the request if achievement tracking fails
        return c.json({
          success: true,
          session: savedSession,
          warning: 'Study session saved but achievement tracking failed',
        })
      }
    } catch (err) {
      console.error('Save study session exception:', err)
      return c.json({ error: 'Failed to save study session' }, 500)
    }
  })

  // ============================================================
  // Get all study sessions for a user
  // ============================================================
  app.get('/study/sessions', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Missing access token for get study sessions')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Auth error in get study sessions: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      const deckId = c.req.query('deckId')
      const studyMode = c.req.query('studyMode')
      const startDate = c.req.query('startDate')
      const endDate = c.req.query('endDate')
      const limit = parseInt(c.req.query('limit') || '100', 10)
      const offset = parseInt(c.req.query('offset') || '0', 10)

      let query = supabase
        .from('study_sessions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)

      if (deckId) query = query.eq('deck_id', deckId)
      if (studyMode) query = query.eq('study_mode', studyMode)
      if (startDate) query = query.gte('started_at', startDate)
      if (endDate) query = query.lte('started_at', endDate)

      query = query
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: sessions, error: dbError, count } = await query

      if (dbError) {
        console.log(`❌ Database error fetching study sessions: ${dbError.message}`)
        return c.json({ error: 'Failed to fetch study sessions' }, 500)
      }

      return c.json({
        sessions: sessions || [],
        total: count || 0,
        limit,
        offset,
      })
    } catch (error) {
      console.log(`❌ Get study sessions error: ${error}`)
      return c.json({ error: 'Failed to get study sessions' }, 500)
    }
  })
}
