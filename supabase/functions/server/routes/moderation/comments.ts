import type { Hono, Context } from 'npm:hono@4'
import { supabase } from '../../lib/supabase.ts'
import { DeleteRequestBody, DeletedItem } from '../../types/moderation.ts'


export function registerCommentsRoutes(app: Hono) {
  // Delete comment from a community deck (MODERATOR/SUPERUSER only)
  app.delete('/moderation/decks/:communityDeckId/comments/:commentId',
    async (c: Context) => {
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

        // ------------------------------------------------------------
        // Permission check
        // ------------------------------------------------------------
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        const isModerator = userData?.is_moderator === true
        const isSuperuser = userData?.is_superuser === true

        if (!isModerator && !isSuperuser) {
          return c.json(
            { error: 'Only moderators and superusers can delete comments' },
            403
          )
        }

        const communityDeckId = c.req.param('communityDeckId')
        const commentId = c.req.param('commentId')

        // ------------------------------------------------------------
        // Parse request body safely
        // ------------------------------------------------------------
        let body: DeleteRequestBody | null = null
        try {
          body = await c.req.json<DeleteRequestBody>()
        } catch {
          body = null
        }

        if (!body?.reason || body.reason.trim().length === 0) {
          return c.json({ error: 'Deletion reason is required' }, 400)
        }

        const fullReason =
          body.additionalDetails && body.additionalDetails.trim().length > 0
            ? `${body.reason.trim()} - ${body.additionalDetails.trim()}`
            : body.reason.trim()

        const now = new Date().toISOString()
        const deletedByName =
          userData.display_name ||
          'Moderator'

        // ------------------------------------------------------------
        // Identify comment vs reply
        // ------------------------------------------------------------
        let deletedItem: DeletedItem | null = null

        // Try comment first
        const { data: comment } = await supabase
          .from('comments')
          .select('user_id, user_name, content, community_deck_id')
          .eq('id', commentId)
          .eq('community_deck_id', communityDeckId)
          .maybeSingle()

        if (comment) {
          deletedItem = {
            kind: 'comment',
            user_id: comment.user_id,
            user_name: comment.user_name,
            content: comment.content,
          }
        } else {
          // Try reply
          const { data: reply } = await supabase
            .from('replies')
            .select('user_id, user_name, content, comment_id')
            .eq('id', commentId)
            .maybeSingle()

          if (reply) {
            const { data: parent } = await supabase
              .from('comments')
              .select('community_deck_id')
              .eq('id', reply.comment_id)
              .maybeSingle()

            if (parent?.community_deck_id === communityDeckId) {
              deletedItem = {
                kind: 'reply',
                user_id: reply.user_id,
                user_name: reply.user_name,
                content: reply.content,
                comment_id: reply.comment_id,
              }
            }
          }
        }

        if (!deletedItem) {
          return c.json({ error: 'Comment or reply not found' }, 404)
        }

        // ------------------------------------------------------------
        // Get deck name
        // ------------------------------------------------------------
        const { data: deck } = await supabase
          .from('community_decks')
          .select('name')
          .eq('id', communityDeckId)
          .single()

        const deckName = deck?.name ?? 'Unknown Deck'

        // ------------------------------------------------------------
        // Soft delete
        // ------------------------------------------------------------
        const table: 'comments' | 'replies' =
          deletedItem.kind === 'comment' ? 'comments' : 'replies'

        const { error: deleteError } = await supabase
          .from(table)
          .update({
            is_deleted: true,
            deleted_at: now,
            updated_at: now,
            deleted_by: userData?.id || null,
            deleted_by_display_name: userData.display_name,
          })
          .eq('id', commentId)

        if (deleteError) {
          return c.json(
            { error: `Failed to delete ${deletedItem.kind}` },
            500
          )
        }

        // ------------------------------------------------------------
        // Log moderation action
        // ------------------------------------------------------------
        await supabase.from('moderation_actions').insert({
          id: crypto.randomUUID(),
          moderator_id: user.id,
          moderator_name: deletedByName,
          action_type:
            deletedItem.kind === 'comment'
              ? 'delete_comment'
              : 'delete_reply',
          target_type: deletedItem.kind,
          target_id: commentId,
          reason: body.reason.trim(),
          additional_details: body.additionalDetails?.trim() || null,
          metadata: {
            community_deck_id: communityDeckId,
            deck_name: deckName,
            original_user_id: deletedItem.user_id,
            original_author_name: deletedItem.user_name,
            content_preview: deletedItem.content.slice(0, 200),
          },
          created_at: now,
        })

        // ------------------------------------------------------------
        // Notify author
        // ------------------------------------------------------------
        if (deletedItem.user_id !== user.id) {
          await supabase.from('notifications').insert({
            id: crypto.randomUUID(),
            user_id: deletedItem.user_id,
            type:
              deletedItem.kind === 'comment'
                ? 'comment_deleted'
                : 'reply_deleted',
            message: `Your ${deletedItem.kind} on "${deckName}" was removed by a moderator: ${fullReason}`,
            is_read: false,
            created_at: now,
            related_deck_id: communityDeckId,
            related_comment_id:
              deletedItem.kind === 'comment'
                ? commentId
                : deletedItem.comment_id,
            related_reply_id:
              deletedItem.kind === 'reply' ? commentId : null,
            deck_name: deckName,
            comment_text: deletedItem.content,
          })
        }

        return c.json({
          success: true,
          message: `${deletedItem.kind} deleted successfully`,
          deletedType: deletedItem.kind,
        })
      } catch (error) {
        console.error('❌ Delete comment exception:', error)
        return c.json({ error: 'Failed to delete comment' }, 500)
      }
    }
  )
}