// ============================================================================
// AI CSV Upload - NO METADATA VERSION
// ============================================================================

import type { Hono } from 'npm:hono@4'
import type { Context } from 'npm:hono@4'
import { supabase } from './lib/supabase.ts'

// Card type definitions
type CardType = 'classic-flip' | 'multiple-choice' | 'type-answer'

type ParsedCard =
  | {
      front: string
      back: string
      cardType: 'classic-flip'
    }
  | {
      front: string
      cardType: 'multiple-choice'
      correctAnswers: string[]
      incorrectAnswers: string[]
    }
  | {
      front: string
      back: string
      cardType: 'type-answer'
      acceptedAnswers: string[]
    }

export function registerAiCsvRoutes(app: Hono) {
  app.post('/ai/generate/csv', async (c: Context) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1]

      if (!accessToken) {
        console.log('❌ Missing access token for CSV import')
        return c.json({ error: 'Missing access token' }, 401)
      }

      const { data: { user }, error: authError } =
        await supabase.auth.getUser(accessToken)

      if (authError || !user) {
        console.log(`❌ Auth error in CSV import: ${authError?.message}`)
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // ✅ Check subscription tier from DATABASE (not metadata)
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile) {
        console.log(`❌ Failed to fetch user profile for CSV import: ${profileError?.message}`)
        return c.json({ error: 'Failed to verify subscription status' }, 500)
      }

      const subscriptionTier = userProfile.subscription_tier || 'free'

      if (subscriptionTier === 'free') {
        console.log(`❌ Free user ${user.id} attempted CSV import`)
        return c.json(
          { error: 'CSV import requires a Premium or Pro subscription' },
          403
        )
      }

      console.log(`✅ User ${user.id} subscription verified: ${subscriptionTier}`)

      // ---- Parse multipart body safely ----
      const body = await c.req.parseBody()

      const file = body['file']
      if (!(file instanceof File)) {
        console.log('❌ No file provided in request')
        return c.json({ error: 'No file provided' }, 400)
      }

      if (!file.name.toLowerCase().endsWith('.csv')) {
        console.log(`❌ Invalid file type: ${file.name}`)
        return c.json(
          { error: 'Invalid file type. Only CSV files are allowed.' },
          400
        )
      }

      if (file.size > 1_048_576) {
        console.log(`❌ File too large: ${file.size}`)
        return c.json(
          { error: 'File too large. Maximum size is 1MB.' },
          400
        )
      }

      console.log(
        `📄 CSV Import - User ${user.id}, File ${file.name}, Size ${file.size}`
      )

      // ---- Read & parse CSV ----
      const text = await file.text()
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)

      if (lines.length < 2) {
        return c.json(
          {
            error:
              'CSV file must contain at least a header row and one data row',
          },
          400
        )
      }

      const headers = lines[0]
        .split(',')
        .map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))

      // Check if there's a Card Type column for mixed formats
      const cardTypeIndex = headers.findIndex(
        (h) => h === 'card type' || h === 'cardtype' || h === 'type'
      )
      const hasMixedFormat = cardTypeIndex !== -1

      // Detect card type based on headers (for single-format CSVs)
      const hasCorrectAnswers = headers.includes('correct answers') || headers.includes('correctanswers')
      const hasIncorrectAnswers = headers.includes('incorrect answers') || headers.includes('incorrectanswers')
      const hasAcceptedAnswers = headers.includes('accepted answers') || headers.includes('acceptedanswers')

      let defaultFormat: CardType = 'classic-flip'

      if (hasCorrectAnswers && hasIncorrectAnswers) {
        defaultFormat = 'multiple-choice'
      } else if (hasAcceptedAnswers) {
        defaultFormat = 'type-answer'
      }

      if (hasMixedFormat) {
        console.log(`🔍 Detected MIXED CSV format with Card Type column`)
      } else {
        console.log(`🔍 Detected single-format CSV: ${defaultFormat}`)
      }

      const questionIndex = headers.findIndex(
        (h) => h === 'question' || h === 'front' || h === 'q'
      )

      let answerIndex = -1
      let correctAnswersIndex = -1
      let incorrectAnswersIndex = -1
      let acceptedAnswersIndex = -1

      if (hasMixedFormat) {
        // For mixed format, we need ALL column indices since rows can be different types
        answerIndex = headers.findIndex(
          (h) => h === 'answer' || h === 'back' || h === 'a'
        )
        correctAnswersIndex = headers.findIndex(
          (h) => h === 'correct answers' || h === 'correctanswers'
        )
        incorrectAnswersIndex = headers.findIndex(
          (h) => h === 'incorrect answers' || h === 'incorrectanswers'
        )
        acceptedAnswersIndex = headers.findIndex(
          (h) => h === 'accepted answers' || h === 'acceptedanswers'
        )

        if (questionIndex === -1) {
          return c.json(
            {
              error:
                'Mixed CSV must have a "Front" (or "Question") column and a "Card Type" column',
            },
            400
          )
        }
      } else if (defaultFormat === 'multiple-choice') {
        correctAnswersIndex = headers.findIndex(
          (h) => h === 'correct answers' || h === 'correctanswers'
        )
        incorrectAnswersIndex = headers.findIndex(
          (h) => h === 'incorrect answers' || h === 'incorrectanswers'
        )

        if (questionIndex === -1 || correctAnswersIndex === -1 || incorrectAnswersIndex === -1) {
          return c.json(
            {
              error:
                'Multiple Choice CSV must have "Question" (or "Front"), "Correct Answers", and "Incorrect Answers" columns',
            },
            400
          )
        }
      } else if (defaultFormat === 'type-answer') {
        answerIndex = headers.findIndex(
          (h) => h === 'answer' || h === 'back' || h === 'a'
        )
        acceptedAnswersIndex = headers.findIndex(
          (h) => h === 'accepted answers' || h === 'acceptedanswers'
        )

        // Only require Front and Back columns - Accepted Answers is optional
        if (questionIndex === -1 || answerIndex === -1) {
          return c.json(
            {
              error:
                'Type Answer CSV must have "Question" (or "Front") and "Answer" (or "Back") columns. "Accepted Answers" is optional.',
            },
            400
          )
        }
      } else {
        // classic-flip
        answerIndex = headers.findIndex(
          (h) => h === 'back' || h === 'answer' || h === 'a'
        )

        if (questionIndex === -1 || answerIndex === -1) {
          return c.json(
            {
              error:
                'Classic Flip CSV must have "Question" (or "Front") and "Answer" (or "Back") columns',
            },
            400
          )
        }
      }

      const cards: ParsedCard[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]

        // Parse CSV line respecting quoted values
        const values: string[] = []
        let current = ''
        let inQuotes = false

        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim())

        const question = values[questionIndex]?.replace(/^"|"$/g, '').trim()
        if (!question) {
          console.warn(`⚠️ Skipping row ${i + 1}: missing question`)
          continue
        }

        if (hasMixedFormat) {
          const cardType = values[cardTypeIndex]?.replace(/^"|"$/g, '').trim() as CardType
          
          console.log(`🔍 Row ${i + 1}: Type="${cardType}", Question="${question}"`)
          
          if (cardType === 'multiple-choice') {
            const correctAnswersRaw = correctAnswersIndex !== -1 
              ? values[correctAnswersIndex]?.replace(/^"|"$/g, '').trim()
              : undefined
            const incorrectAnswersRaw = incorrectAnswersIndex !== -1
              ? values[incorrectAnswersIndex]?.replace(/^"|"$/g, '').trim()
              : undefined

            console.log(`   Correct raw: "${correctAnswersRaw}", Incorrect raw: "${incorrectAnswersRaw}"`)

            if (correctAnswersRaw && incorrectAnswersRaw) {
              // Split by semicolon or pipe
              const correctSep = correctAnswersRaw.includes(';') ? ';' : '|'
              const incorrectSep = incorrectAnswersRaw.includes(';') ? ';' : '|'
              
              const correctAnswers = correctAnswersRaw
                .split(correctSep)
                .map((v) => v.trim())
                .filter(Boolean)

              const incorrectAnswers = incorrectAnswersRaw
                .split(incorrectSep)
                .map((v) => v.trim())
                .filter(Boolean)

              console.log(`   Parsed: ${correctAnswers.length} correct, ${incorrectAnswers.length} incorrect`)

              // Changed from >= 3 to >= 2 for more flexibility
              if (correctAnswers.length > 0 && incorrectAnswers.length >= 2) {
                // Ensure we have exactly 3 incorrect answers (pad if needed)
                while (incorrectAnswers.length < 3) {
                  incorrectAnswers.push(`Option ${incorrectAnswers.length + 1}`)
                }
                
                cards.push({
                  front: question,
                  cardType: 'multiple-choice',
                  correctAnswers,
                  incorrectAnswers: incorrectAnswers.slice(0, 3), // Take only first 3
                })
                console.log(`   ✅ Added multiple-choice card`)
              } else {
                console.warn(
                  `⚠️ Skipping row ${i + 1}: multiple-choice card needs at least 1 correct answer and 2 incorrect answers (got ${correctAnswers.length} correct, ${incorrectAnswers.length} incorrect)`
                )
              }
            } else {
              console.warn(`⚠️ Skipping row ${i + 1}: missing correct or incorrect answers for multiple-choice card`)
            }
          } else if (cardType === 'type-answer') {
            const answer = answerIndex !== -1
              ? values[answerIndex]?.replace(/^"|"$/g, '').trim()
              : undefined
            const acceptedAnswersRaw = acceptedAnswersIndex !== -1
              ? values[acceptedAnswersIndex]?.replace(/^"|"$/g, '').trim()
              : undefined

            if (answer) {
              // Accepted answers are OPTIONAL
              const acceptedAnswers: string[] = []
              if (acceptedAnswersRaw) {
                // Split by semicolon or pipe
                const sep = acceptedAnswersRaw.includes(';') ? ';' : '|'
                const parsed = acceptedAnswersRaw
                  .split(sep)
                  .map((v) => v.trim())
                  .filter(Boolean)
                acceptedAnswers.push(...parsed)
              }

              cards.push({
                front: question,
                back: answer,
                cardType: 'type-answer',
                acceptedAnswers,
              })
            } else {
              console.warn(`⚠️ Skipping row ${i + 1}: type-answer card missing answer`)
            }
          } else {
            // classic-flip
            const answer = values[answerIndex]?.replace(/^"|"$/g, '').trim()
            if (answer) {
              cards.push({
                front: question,
                back: answer,
                cardType: 'classic-flip',
              })
            } else {
              console.warn(`⚠️ Skipping row ${i + 1}: missing answer`)
            }
          }
        } else {
          if (defaultFormat === 'multiple-choice') {
            const correctAnswersRaw = values[correctAnswersIndex]?.replace(/^"|"$/g, '').trim()
            const incorrectAnswersRaw = values[incorrectAnswersIndex]?.replace(/^"|"$/g, '').trim()

            if (correctAnswersRaw && incorrectAnswersRaw) {
              // Split by semicolon or pipe
              const correctSep = correctAnswersRaw.includes(';') ? ';' : '|'
              const incorrectSep = incorrectAnswersRaw.includes(';') ? ';' : '|'
              
              const correctAnswers = correctAnswersRaw
                .split(correctSep)
                .map((v) => v.trim())
                .filter(Boolean)

              const incorrectAnswers = incorrectAnswersRaw
                .split(incorrectSep)
                .map((v) => v.trim())
                .filter(Boolean)

              if (correctAnswers.length > 0 && incorrectAnswers.length >= 3) {
                cards.push({
                  front: question,
                  cardType: 'multiple-choice',
                  correctAnswers,
                  incorrectAnswers: incorrectAnswers.slice(0, 3), // Take only first 3
                })
              } else {
                console.warn(
                  `⚠️ Skipping row ${i + 1}: multiple-choice card needs at least 1 correct answer and 3 incorrect answers`
                )
              }
            } else {
              console.warn(`⚠️ Skipping row ${i + 1}: missing correct or incorrect answers`)
            }
          } else if (defaultFormat === 'type-answer') {
            const answer = values[answerIndex]?.replace(/^"|"$/g, '').trim()
            const acceptedAnswersRaw = acceptedAnswersIndex !== -1
              ? values[acceptedAnswersIndex]?.replace(/^"|"$/g, '').trim()
              : undefined

            if (answer) {
              // Accepted answers are OPTIONAL
              const acceptedAnswers: string[] = []
              if (acceptedAnswersRaw) {
                // Split by semicolon or pipe
                const sep = acceptedAnswersRaw.includes(';') ? ';' : '|'
                const parsed = acceptedAnswersRaw
                  .split(sep)
                  .map((v) => v.trim())
                  .filter(Boolean)
                acceptedAnswers.push(...parsed)
              }

              cards.push({
                front: question,
                back: answer,
                cardType: 'type-answer',
                acceptedAnswers,
              })
            } else {
              console.warn(`⚠️ Skipping row ${i + 1}: type-answer card missing answer`)
            }
          } else {
            // classic-flip
            const answer = values[answerIndex]?.replace(/^"|"$/g, '').trim()
            if (answer) {
              cards.push({
                front: question,
                back: answer,
                cardType: 'classic-flip',
              })
            } else {
              console.warn(`⚠️ Skipping row ${i + 1}: missing answer`)
            }
          }
        }
      }

      if (cards.length === 0) {
        return c.json({ error: 'No valid cards found in CSV file' }, 400)
      }

      console.log(`✅ Parsed ${cards.length} cards from CSV (format: ${hasMixedFormat ? 'mixed' : defaultFormat})`)
      return c.json({ cards })
    } catch (error) {
      console.log(`❌ CSV import exception: ${error}`)
      return c.json({ error: 'Failed to import CSV file' }, 500)
    }
  })
}