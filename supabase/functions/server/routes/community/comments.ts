import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import type { CommentResponse, ReplyResponse } from '../../types/community.ts'
import { sendCommentReplyEmail, sendDeckCommentEmail } from '../../lib/emailService.ts'  // ✅ ADD THIS IMPORT

// ============================================================
// Helper: Get user display info from database
// ============================================================
async function getUserDisplayInfo(userId: string): Promise<{ displayName: string; avatar: string | null; email: string | null }> {  // ✅ ADD EMAIL
  const { data: userData, error } = await supabase
    .from('users')
    .select('display_name, avatar_url, email')  // ✅ ADD EMAIL
    .eq('id', userId)
    .single()
  
  if (error || !userData) {
    console.log(`⚠️ Warning: Could not fetch user info for ${userId}, using defaults`)
    return { displayName: 'Anonymous', avatar: null, email: null }  // ✅ ADD EMAIL
  }
  
  return {
    displayName: userData.display_name || 'Anonymous',
    avatar: userData.avatar_url || null,
    email: userData.email || null  // ✅ ADD EMAIL
  }
}

export function registerCommunityCommentsRoutes(app: Hono) {
  // Get comments for a deck
  app.get('/community/decks/:communityDeckId/comments', async (c: Context) => {
    try {
      const communityDeckId = c.req.param('communityDeckId')
      console.log(`💬 Fetching comments for deck ${communityDeckId}`)

      // ------------------------------------------------------------
      // Fetch comments
      // ------------------------------------------------------------
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('community_deck_id', communityDeckId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (commentsError) {
        return c.json({ error: 'Failed to fetch comments' }, 500)
      }

      if (!comments || comments.length === 0) {
        return c.json({ comments: [] })
      }

      // ------------------------------------------------------------
      // Fetch replies for these comments
      // ------------------------------------------------------------
      const commentIds = comments.map(c => c.id)

      const { data: replies, error: repliesError } = await supabase
        .from('replies')
        .select('*')
        .in('comment_id', commentIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (repliesError) {
        return c.json({ error: 'Failed to fetch replies' }, 500)
      }

      // ------------------------------------------------------------
      // ✅ FETCH LIKES FOR COMMENTS AND REPLIES
      // ------------------------------------------------------------
      const allCommentAndReplyIds = [
        ...commentIds,
        ...(replies || []).map(r => r.id)
      ]

      const { data: likes, error: likesError } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', allCommentAndReplyIds)

      if (likesError) {
        console.log(`⚠️ Warning: Failed to fetch likes: ${likesError.message}`)
      }

      // Group likes by comment_id
      const likesByCommentId = new Map<string, string[]>()
      for (const like of likes || []) {
        if (!likesByCommentId.has(like.comment_id)) {
          likesByCommentId.set(like.comment_id, [])
        }
        likesByCommentId.get(like.comment_id)!.push(like.user_id)
      }

      console.log(`✅ Fetched ${likes?.length || 0} likes for ${allCommentAndReplyIds.length} comments/replies`)

      // ------------------------------------------------------------
      // Group replies by comment_id
      // ------------------------------------------------------------
      const repliesByCommentId = new Map<string, ReplyResponse[]>()

      for (const reply of replies ?? []) {
        const formatted: ReplyResponse = {
          id: reply.id,
          userId: reply.user_id,
          userName: reply.user_name,
          userDisplayName: reply.user_display_name,
          userAvatar: reply.user_avatar,
          content: reply.content,
          createdAt: reply.created_at,
          updatedAt: reply.updated_at,
          communityDeckId: communityDeckId,
          likes: likesByCommentId.get(reply.id) || []  // ✅ ADD LIKES
        }

        if (!repliesByCommentId.has(reply.comment_id)) {
          repliesByCommentId.set(reply.comment_id, [])
        }

        repliesByCommentId.get(reply.comment_id)!.push(formatted)
      }

      // ------------------------------------------------------------
      // Build final response
      // ------------------------------------------------------------
      const response: CommentResponse[] = comments.map(comment => ({
        id: comment.id,
        userId: comment.user_id,
        userName: comment.user_name,
        userDisplayName: comment.user_display_name,
        userAvatar: comment.user_avatar,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        replies: repliesByCommentId.get(comment.id) ?? [],
        communityDeckId: communityDeckId,
        likes: likesByCommentId.get(comment.id) || []  // ✅ ADD LIKES
      }))

      console.log(`✅ Returning ${response.length} comments with likes`)
      return c.json({ comments: response })

    } catch (error) {
      console.error('❌ Get comments exception:', error)
      return c.json({ error: 'Failed to fetch comments' }, 500)
    }
  })

  // Post a comment OR reply on a community deck
  app.post('/community/decks/:communityDeckId/comments', async (c: Context) => {
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

      const communityDeckId = c.req.param('communityDeckId')
      const body = await c.req.json()
      const { content, parentCommentId } = body

      if (!content || content.trim().length === 0) {
        console.log('❌ Empty comment content')
        return c.json({ error: 'Comment content is required' }, 400)
      }

      // ✅ GET USER INFO FROM DATABASE (not metadata!)
      const userInfo = await getUserDisplayInfo(user.id)
      const userDisplayName = userInfo.displayName
      const userAvatar = userInfo.avatar
      const now = new Date().toISOString()
      
      // ============================================================
      // SCHEMA-CORRECT: Insert into comments OR replies table
      // ============================================================
      
      if (parentCommentId) {
        // This is a REPLY - insert into replies table
        const replyId = crypto.randomUUID()
        
        console.log(`💬 User ${user.id} posting REPLY on comment ${parentCommentId}`)
        
        const { error: insertError } = await supabase
          .from('replies')
          .insert({
            id: replyId,
            comment_id: parentCommentId,
            user_id: user.id,
            content: content.trim(),
            is_flagged: false,
            user_name: userDisplayName,
            user_display_name: userDisplayName,
            user_avatar: userAvatar,
            created_at: now,
            updated_at: now
          })
        
        if (insertError) {
          console.log(`❌ Error inserting reply: ${insertError.message}`)
          return c.json({ error: 'Failed to post reply' }, 500)
        }
        
        console.log(`✅ Reply ${replyId} inserted successfully`)
        
        // Notify parent comment author
        const { data: parentComment } = await supabase
          .from('comments')
          .select('user_id, content')
          .eq('id', parentCommentId)
          .single()
        
        if (parentComment && parentComment.user_id !== user.id) {
          // Get deck info
          const { data: deck } = await supabase
            .from('community_decks')
            .select('name')
            .eq('id', communityDeckId)
            .single()
          
          const notificationId = crypto.randomUUID()
          await supabase.from('notifications').insert({
            id: notificationId,
            user_id: parentComment.user_id,
            type: 'comment_reply',
            message: `${userDisplayName} replied to your comment on "${deck?.name || 'a deck'}"`,
            is_read: false,
            created_at: now,
            related_user_id: user.id,
            related_deck_id: communityDeckId,
            related_comment_id: parentCommentId,
            related_reply_id: replyId,
            requester_display_name: userDisplayName,
            requester_avatar: userAvatar,
            deck_name: deck?.name || null,
            comment_text: content.trim()
          })
          
          console.log(`✅ Reply notification created for user ${parentComment.user_id}`)
          
          // ============================================================
          // ✅ SEND EMAIL NOTIFICATION FOR COMMENT REPLY
          // ============================================================
          try {
            const recipientInfo = await getUserDisplayInfo(parentComment.user_id)
            
            if (recipientInfo.email) {
              await sendCommentReplyEmail(
                parentComment.user_id,           // toUserId
                recipientInfo.email,              // toEmail
                recipientInfo.displayName,        // toDisplayName
                userDisplayName,                  // fromDisplayName
                deck?.name || 'a deck',          // deckName
                parentComment.content,            // commentText (original comment)
                content.trim()                    // replyText (the reply)
              )
              
              console.log(`📧 Comment reply email sent to ${recipientInfo.email}`)
            }
          } catch (emailError) {
            console.error(`⚠️ Failed to send comment reply email: ${emailError}`)
            // Don't fail the whole operation if email fails
          }
        }
        
        return c.json({ 
          reply: {
            id: replyId,
            commentId: parentCommentId,
            userId: user.id,
            userName: userDisplayName,
            userDisplayName,
            userAvatar,
            content: content.trim(),
            createdAt: now
          },
          message: 'Reply posted successfully' 
        })
        
      } else {
        // This is a TOP-LEVEL COMMENT - insert into comments table
        const commentId = crypto.randomUUID()
        
        console.log(`💬 User ${user.id} posting COMMENT on deck ${communityDeckId}`)
        
        const { error: insertError } = await supabase
          .from('comments')
          .insert({
            id: commentId,
            community_deck_id: communityDeckId,
            user_id: user.id,
            content: content.trim(),
            is_flagged: false,
            user_name: userDisplayName,
            user_display_name: userDisplayName,
            user_avatar: userAvatar,
            created_at: now,
            updated_at: now
          })
        
        if (insertError) {
          console.log(`❌ Error inserting comment: ${insertError.message}`)
          return c.json({ error: 'Failed to post comment' }, 500)
        }
        
        console.log(`✅ Comment ${commentId} inserted successfully`)
        

        // ============================================================
        // 🎯 ACHIEVEMENT TRACKING - COMMENT ACHIEVEMENTS
        // ============================================================

        let achievementsUnlocked: string[] = []
        try {
          // Count total comments by this user
          const { count: totalComments, error: countError } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

          if (countError) {
            console.log(`⚠️ Error counting comments: ${countError.message}`)
          } else {
            console.log(`📊 User ${user.id} now has ${totalComments || 0} comment(s)`)

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

              // Check comment achievements
              if ((totalComments || 0) >= 5 && !currentUnlocked.includes('helpful-commenter')) {
                newlyUnlocked.push('helpful-commenter')  // 5 comments
              }
              if ((totalComments || 0) >= 20 && !currentUnlocked.includes('active-member')) {
                newlyUnlocked.push('active-member')  // 20 comments
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
                }
                achievementsUnlocked = newlyUnlocked
              }
            }
          }
        } catch (achievementTrackingError) {
          console.log(`❌ Achievement tracking error: ${achievementTrackingError}`)
          // Don't fail the whole request if achievement tracking fails
        }

        // Notify deck owner
        const { data: deck } = await supabase
          .from('community_decks')
          .select('owner_id, name')
          .eq('id', communityDeckId)
          .single()
        
        if (deck && deck.owner_id && deck.owner_id !== user.id) {
          const notificationId = crypto.randomUUID()
          await supabase.from('notifications').insert({
            id: notificationId,
            user_id: deck.owner_id,
            type: 'deck_comment',
            message: `${userDisplayName} commented on your deck "${deck.name}"`,
            is_read: false,
            created_at: now,
            related_user_id: user.id,
            related_deck_id: communityDeckId,
            related_comment_id: commentId,
            requester_display_name: userDisplayName,
            requester_avatar: userAvatar,
            deck_name: deck.name,
            achievementsUnlocked: achievementsUnlocked || [],
            comment_text: content.trim()
          })
          
          console.log(`✅ Comment notification created for deck owner ${deck.owner_id}`)
        }
        
        // ============================================================
        // ✅ SEND EMAIL NOTIFICATION FOR DECK COMMENT
        // ============================================================
        try {
          const deckOwnerInfo = await getUserDisplayInfo(deck.owner_id)
          
          if (deckOwnerInfo.email) {
            await sendDeckCommentEmail(
              deck.owner_id,                // deckOwnerId
              deckOwnerInfo.email,          // deckOwnerEmail
              deckOwnerInfo.displayName,    // deckOwnerName
              userDisplayName,              // commenterName
              deck.name,                    // deckName
              content.trim()                // commentText
            )
            
            console.log(`📧 Deck comment email sent to ${deckOwnerInfo.email}`)
          }
        } catch (emailError) {
          console.error(`⚠️ Failed to send deck comment email: ${emailError}`)
          // Don't fail the whole operation if email fails
        }
      

        return c.json({ 
          comment: {
            id: commentId,
            communityDeckId,
            userId: user.id,
            userName: userDisplayName,
            userDisplayName,
            userAvatar,
            content: content.trim(),
            createdAt: now,
            replies: []
          },
          message: 'Comment posted successfully' 
        })
      }
      
    } catch (error) {
      console.log(`❌ Post comment/reply exception: ${error}`)
      return c.json({ error: 'Failed to post comment/reply' }, 500)
    }
  })

  // Like/unlike a comment or reply
  app.post('/community/decks/:communityDeckId/comments/:commentId/like', async (c: Context) => {
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

      const communityDeckId = c.req.param('communityDeckId')
      const commentId = c.req.param('commentId')

      console.log(`👍 User ${user.id} toggling like on comment/reply ${commentId}`)
      
      // ============================================================
      // SCHEMA-CORRECT: Toggle like in comment_likes table
      // ============================================================
      
      const now = new Date().toISOString()
      
      // Check if like already exists
      const { data: existingLike, error: checkError } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (checkError) {
        console.log(`❌ Error checking like: ${checkError.message}`)
        return c.json({ error: 'Failed to process like' }, 500)
      }
      
      const alreadyLiked = !!existingLike
      
      if (alreadyLiked) {
        // Unlike - remove the like
        console.log(`👎 Removing like (unlike)`)
        
        const { error: deleteError } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
        
        if (deleteError) {
          console.log(`❌ Error removing like: ${deleteError.message}`)
          return c.json({ error: 'Failed to unlike comment' }, 500)
        }
        
        console.log(`✅ Like removed`)
        return c.json({ success: true, liked: false })
      } else {
        // Like - add the like
        console.log(`👍 Adding like`)
        
        const { error: insertError } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            created_at: now
          })
        
        if (insertError) {
          console.log(`❌ Error adding like: ${insertError.message}`)
          return c.json({ error: 'Failed to like comment' }, 500)
        }
        
        console.log(`✅ Like added`)
        
        // Try to find the comment or reply to notify the author
        let authorId: string | null = null
        let isComment = false
        
        // Check if it's a comment
        const { data: comment } = await supabase
          .from('comments')
          .select('user_id, community_deck_id')
          .eq('id', commentId)
          .eq('community_deck_id', communityDeckId)
          .maybeSingle()
        
        if (comment) {
          authorId = comment.user_id
          isComment = true
        } else {
          // Check if it's a reply
          const { data: reply } = await supabase
            .from('replies')
            .select('user_id, comment_id')
            .eq('id', commentId)
            .maybeSingle()
          
          if (reply) {
            // Verify it belongs to this deck via its parent comment
            const { data: parentComment } = await supabase
              .from('comments')
              .select('community_deck_id')
              .eq('id', reply.comment_id)
              .maybeSingle()
            
            if (parentComment?.community_deck_id === communityDeckId) {
              authorId = reply.user_id
              isComment = false
            }
          }
        }
        
        // Notify the author (only if not their own comment/reply)
        if (authorId && authorId !== user.id) {
          console.log(`📬 Notifying ${isComment ? 'comment' : 'reply'} author ${authorId}`)
          
          // Get deck info
          const { data: deck } = await supabase
            .from('community_decks')
            .select('name')
            .eq('id', communityDeckId)
            .single()
          
          const deckName = deck?.name || 'a deck'
          
          // ✅ GET USER INFO FROM DATABASE (not metadata!)
          const userInfo = await getUserDisplayInfo(user.id)
          const userDisplayName = userInfo.displayName
          const userAvatar = userInfo.avatar
          
          const notificationId = crypto.randomUUID()
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              id: notificationId,
              user_id: authorId,
              type: 'comment_like',
              message: `${userDisplayName} liked your ${isComment ? 'comment' : 'reply'} on "${deckName}"`,
              is_read: false,
              created_at: now,
              related_user_id: user.id,
              related_deck_id: communityDeckId,
              related_comment_id: commentId,
              requester_display_name: userDisplayName,
              requester_avatar: userAvatar,
              deck_name: deckName
            })
          
          if (notifError) {
            console.log(`⚠️ Warning: Failed to create notification: ${notifError.message}`)
            // Don't fail the operation if notification fails
          } else {
            console.log(`✅ Notification sent to author`)
          }
        }
        
        return c.json({ success: true, liked: true })
      }
    } catch (error) {
      console.log(`❌ Like comment exception: ${error}`)
      return c.json({ error: 'Failed to like comment' }, 500)
    }
  })
}