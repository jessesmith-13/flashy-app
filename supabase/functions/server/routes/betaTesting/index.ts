import type { Hono } from "npm:hono@4";
import type { Context } from "npm:hono@4";
import { supabase } from "../../lib/supabase.ts";
import { sendBetaFeedbackEmail } from "../../lib/emailService.ts";

export function registerBetaTestingRoutes(app: Hono) {
  // Get all beta testing tasks for the current user
  app.get("/beta-testing/tasks", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get all tasks for this user
      const { data: tasks, error: tasksError } = await supabase
        .from("beta_testing_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (tasksError) {
        console.error("Error fetching beta testing tasks:", tasksError);
        return c.json({ error: "Failed to fetch tasks" }, 500);
      }

      return c.json(tasks);
    } catch (error) {
      console.error("Error in GET /beta-testing/tasks:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // Mark a task as complete/incomplete
  app.post("/beta-testing/tasks/:taskId", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const taskId = c.req.param("taskId");
      const body = await c.req.json();
      const { completed, status, notes } = body; // Add status support

      // Validate status if provided
      if (status && !["not_tested", "works", "broken"].includes(status)) {
        return c.json(
          { error: "Invalid status. Must be: not_tested, works, or broken" },
          400
        );
      }

      // Category mapping
      const categoryMap: Record<string, string> = {
        signup: "getting-started",
        login: "getting-started",
        "profile-view": "getting-started",
        "dark-mode": "getting-started",
        "create-deck": "decks",
        "edit-deck": "decks",
        "set-languages": "decks",
        "delete-deck": "decks",
        "add-classic-flip": "cards",
        "add-multiple-choice": "cards",
        "add-type-answer": "cards",
        "edit-card": "cards",
        "delete-card": "cards",
        "add-image-card": "cards",
        "add-audio-card": "cards",
        "start-study": "study",
        "classic-flip-study": "study",
        "multiple-choice-study": "study",
        "type-answer-study": "study",
        "complete-session": "study",
        "check-progress": "study",
        "view-achievements": "achievements",
        "unlock-achievement": "achievements",
        "check-streak": "achievements",
        "add-friend": "friends",
        "accept-friend": "friends",
        "view-friend-profile": "friends",
        "remove-friend": "friends",
        "browse-community": "community",
        "search-community": "community",
        "filter-community": "community",
        "view-community-deck": "community",
        "copy-community-deck": "community",
        "publish-deck": "community",
        "unpublish-deck": "community",
        "rate-deck": "community",
        "comment-deck": "community",
        "flag-content": "community",
        "ai-generate": "ai-features",
        "ai-chat": "ai-features",
        "ai-translate-front": "ai-features",
        "ai-translate-back": "ai-features",
        "ai-cross-language": "ai-features",
        "view-plans": "subscription",
        "check-features": "subscription",
        "upgrade-flow": "subscription",
        "check-subscription-status": "subscription",
        "email-preferences": "settings",
        "update-profile": "settings",
        "settings-persist": "settings",
        "mobile-responsive": "mobile",
        "mobile-study": "mobile",
        "mobile-buttons": "mobile",
        "mobile-rotate": "mobile",
        "mobile-nav": "mobile",
      };

      const taskCategory = categoryMap[taskId] || "other";
      const now = new Date().toISOString();

      // Determine final status and completed flag
      const finalStatus = status || (completed ? "works" : "not_tested");
      const isCompleted = finalStatus === "works" || finalStatus === "broken"; // Both count as "tested"

      // Upsert the task
      const { error: upsertError } = await supabase
        .from("beta_testing_tasks")
        .upsert(
          {
            user_id: user.id,
            task_id: taskId,
            task_category: taskCategory,
            completed: isCompleted, // Backwards compatibility
            status: finalStatus, // NEW: 3-state status
            completed_at: isCompleted ? now : null,
            notes: notes || null,
            updated_at: now,
          },
          {
            onConflict: "user_id,task_id",
          }
        );

      if (upsertError) {
        console.error("Error updating beta testing task:", upsertError);
        return c.json({ error: "Failed to update task" }, 500);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("Error in POST /beta-testing/tasks/:taskId:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // Submit beta testing feedback
  app.post("/beta-testing/feedback", async (c) => {
    try {
      // Get user from access token
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(accessToken);

      if (userError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get user data for email
      const { data: userData } = await supabase
        .from("users")
        .select("display_name, email")
        .eq("id", user.id)
        .single();

      const body = await c.req.json();
      const { rating, message } = body; // REMOVED: category

      if (!message || !message.trim()) {
        return c.json({ error: "Message is required" }, 400);
      }

      // Store feedback in beta_testing_feedback table (NO category field)
      const { error: insertError } = await supabase
        .from("beta_testing_feedback")
        .insert({
          user_id: user.id,
          rating: rating || null,
          message: message.trim(),
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error inserting beta testing feedback:", insertError);
        return c.json({ error: "Failed to submit feedback" }, 500);
      }

      // Get ALL tasks for this user (not just completed) - INCLUDE NOTES!
      const { data: allTasks } = await supabase
        .from("beta_testing_tasks")
        .select("task_id, task_category, status, notes")
        .eq("user_id", user.id);

      // Separate tasks by status
      const workingTasks = (allTasks || []).filter((t) => t.status === "works");
      const brokenTasks = (allTasks || []).filter((t) => t.status === "broken");
      const notTestedTasks = (allTasks || []).filter(
        (t) => t.status === "not_tested"
      );

      // Map task IDs to readable names
      const taskNameMap: Record<string, string> = {
        signup: "Sign up for Flashy",
        login: "Log in to Flashy",
        "profile-view": "View your profile",
        "dark-mode": "Toggle dark mode",
        "create-deck": "Create a new deck",
        "edit-deck": "Edit deck settings",
        "set-languages": "Set front/back languages",
        "delete-deck": "Delete a deck",
        "add-classic-flip": "Add a Classic Flip card",
        "add-multiple-choice": "Add a Multiple Choice card",
        "add-type-answer": "Add a Type Answer card",
        "edit-card": "Edit a flashcard",
        "delete-card": "Delete a flashcard",
        "add-image-card": "Add a card with an image",
        "add-audio-card": "Add a card with audio",
        "start-study": "Start a study session",
        "classic-flip-study": "Study with Classic Flip",
        "multiple-choice-study": "Study with Multiple Choice",
        "type-answer-study": "Study with Type Answer",
        "complete-session": "Complete a study session",
        "check-progress": "Check your progress stats",
        "view-achievements": "View achievements page",
        "unlock-achievement": "Unlock an achievement",
        "check-streak": "Check your streak",
        "add-friend": "Send a friend request",
        "accept-friend": "Accept a friend request",
        "view-friend-profile": "View a friend's profile",
        "remove-friend": "Remove a friend",
        "browse-community": "Browse community decks",
        "search-community": "Search for a deck",
        "filter-community": "Filter decks by language",
        "view-community-deck": "View a community deck",
        "copy-community-deck": "Copy a community deck",
        "publish-deck": "Publish a deck",
        "unpublish-deck": "Unpublish a deck",
        "rate-deck": "Rate a community deck",
        "comment-deck": "Comment on a deck",
        "flag-content": "Flag inappropriate content",
        "ai-generate": "Generate cards with AI",
        "ai-chat": "Chat with AI about a deck",
        "ai-translate-front": "Translate front text with AI",
        "ai-translate-back": "Translate back text with AI",
        "ai-cross-language": "Create cross-language cards with AI",
        "view-plans": "View subscription plans",
        "check-features": "Check tier-locked features",
        "upgrade-flow": "Go through upgrade flow",
        "check-subscription-status": "Check subscription status",
        "email-preferences": "Update email preferences",
        "update-profile": "Update profile settings",
        "settings-persist": "Check settings persistence",
        "mobile-responsive": "View app on mobile",
        "mobile-study": "Study session on mobile",
        "mobile-buttons": "Tap all buttons on mobile",
        "mobile-rotate": "Rotate device during study",
        "mobile-nav": "Use mobile navigation",
      };

      // Format tasks for email (include notes!)
      const formattedWorkingTasks = workingTasks.map((t) => ({
        taskId: t.task_id,
        taskName: taskNameMap[t.task_id] || t.task_id,
        category: t.task_category,
        status: "works" as const,
        notes: t.notes || null,
      }));

      const formattedBrokenTasks = brokenTasks.map((t) => ({
        taskId: t.task_id,
        taskName: taskNameMap[t.task_id] || t.task_id,
        category: t.task_category,
        status: "broken" as const,
        notes: t.notes || null,
      }));

      const formattedNotTestedTasks = notTestedTasks.map((t) => ({
        taskId: t.task_id,
        taskName: taskNameMap[t.task_id] || t.task_id,
        category: t.task_category,
        status: "not_tested" as const,
        notes: t.notes || null,
      }));

      // Send email with ALL tasks (including notes!)
      try {
        await sendBetaFeedbackEmail(
          user.email || "",
          userData?.display_name || "Beta Tester",
          rating || null,
          message.trim(),
          formattedWorkingTasks,
          formattedBrokenTasks,
          formattedNotTestedTasks
        );
        console.log("✅ Beta feedback email sent successfully");
      } catch (emailError) {
        console.error("❌ Failed to send beta feedback email:", emailError);
        // Don't fail the request if email fails
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("Error in POST /beta-testing/feedback:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // Get beta testing statistics (any authenticated user can view)
  app.get("/beta-testing/stats", async (c: Context) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];
      if (!accessToken) {
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get total beta testers (users with the flag set)
      const { count: totalBetaTesters } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("is_beta_tester", true);

      // Get all tasks
      const { data: allTasks } = await supabase
        .from("beta_testing_tasks")
        .select("*");

      // Calculate stats
      const totalTasks = allTasks?.length || 0;
      const completedTasks = allTasks?.filter((t) => t.completed).length || 0;
      const averageCompletion =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Top completed tasks
      const taskCounts: Record<string, number> = {};
      allTasks?.forEach((task) => {
        if (task.completed) {
          taskCounts[task.task_id] = (taskCounts[task.task_id] || 0) + 1;
        }
      });

      const topCompletedTasks = Object.entries(taskCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([taskId, count]) => ({ taskId, completionCount: count }));

      const leastCompletedTasks = Object.entries(taskCounts)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 10)
        .map(([taskId, count]) => ({ taskId, completionCount: count }));

      // Get recent feedback from database
      const { data: recentFeedback } = await supabase
        .from("beta_testing_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const { count: totalFeedback } = await supabase
        .from("beta_testing_feedback")
        .select("*", { count: "exact", head: true });

      return c.json({
        total_beta_testers: totalBetaTesters || 0,
        average_completion: averageCompletion,
        total_feedback: totalFeedback || 0,
        top_completed_tasks: topCompletedTasks.map((t) => ({
          task_id: t.taskId,
          completion_count: t.completionCount,
        })),
        least_completed_tasks: leastCompletedTasks.map((t) => ({
          task_id: t.taskId,
          completion_count: t.completionCount,
        })),
        recent_feedback: recentFeedback || [], // keep raw rows snake_case
      });
    } catch (error) {
      console.error("Error in GET /beta-testing/stats:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}
