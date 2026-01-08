drop extension if exists "pg_net";


  create table "public"."cards" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "deck_id" uuid not null,
    "type" text not null default 'classic'::text,
    "front" text,
    "back" text,
    "correct_answers" text[],
    "incorrect_answers" text[],
    "accepted_answers" text[],
    "audio_url" text,
    "status" text default 'learning'::text,
    "favorite" boolean default false,
    "times_reviewed" integer default 0,
    "times_correct" integer default 0,
    "is_deleted" boolean default false,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "position" integer not null,
    "card_type" text not null default 'classic-flip'::text,
    "front_image_url" text,
    "back_image_url" text,
    "is_ignored" boolean default false,
    "front_audio" text,
    "back_audio" text
      );


alter table "public"."cards" enable row level security;


  create table "public"."comment_likes" (
    "id" uuid not null default gen_random_uuid(),
    "comment_id" uuid not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."comment_likes" enable row level security;


  create table "public"."comments" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "community_deck_id" uuid not null,
    "user_id" uuid not null,
    "content" text not null,
    "is_flagged" boolean default false,
    "user_name" text,
    "user_display_name" text,
    "user_avatar" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_deleted" boolean not null default false,
    "deleted_at" timestamp with time zone,
    "deleted_by" uuid,
    "deleted_reason" text,
    "deleted_by_display_name" text
      );


alter table "public"."comments" enable row level security;


  create table "public"."community_cards" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "community_deck_id" uuid not null,
    "card_type" text not null default 'classic'::text,
    "front" text,
    "back" text,
    "correct_answers" text[],
    "incorrect_answers" text[],
    "accepted_answers" text[],
    "audio_url" text,
    "created_at" timestamp with time zone default now(),
    "position" integer not null,
    "updated_at" timestamp with time zone,
    "front_image_url" text,
    "back_image_url" text,
    "is_flagged" boolean not null default false,
    "is_deleted" boolean not null default false,
    "deleted_at" timestamp with time zone,
    "deleted_reason" text,
    "deleted_by" uuid,
    "deleted_by_name" text,
    "front_audio" text,
    "back_audio" text
      );


alter table "public"."community_cards" enable row level security;


  create table "public"."community_decks" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "owner_id" uuid not null,
    "original_deck_id" uuid,
    "name" text not null,
    "description" text,
    "category" text not null,
    "subtopic" text not null,
    "card_count" integer default 0,
    "import_count" integer default 0,
    "featured" boolean default false,
    "is_flagged" boolean default false,
    "published_at" timestamp with time zone default now(),
    "version" integer default 1,
    "owner_name" text,
    "owner_display_name" text,
    "owner_avatar" text,
    "average_rating" numeric(3,2) default 0,
    "rating_count" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "front_language" text,
    "back_language" text,
    "color" text,
    "difficulty" text,
    "emoji" text,
    "is_published" boolean not null default true,
    "source_content_updated_at" timestamp with time zone,
    "download_count" integer not null default 0,
    "is_deleted" boolean not null default false,
    "deleted_at" timestamp with time zone,
    "deleted_by" uuid,
    "deleted_reason" text,
    "comment_count" integer not null default 0
      );


alter table "public"."community_decks" enable row level security;


  create table "public"."decks" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "theme" text default 'blue'::text,
    "is_deleted" boolean default false,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "position" integer default 0,
    "back_language" text,
    "front_language" text,
    "category" text,
    "subtopic" text,
    "difficulty" text,
    "deck_type" text default 'classic-flip'::text,
    "color" text default '#10B981'::text,
    "emoji" text default '📚'::text,
    "card_count" integer default 0,
    "creator_id" uuid,
    "publish_banned" boolean default false,
    "publish_banned_reason" text,
    "is_public" boolean default false,
    "is_community" boolean default false,
    "is_published" boolean not null default false,
    "content_updated_at" timestamp with time zone,
    "source_community_deck_id" uuid,
    "imported_from_version" integer,
    "is_favorite" boolean not null default false,
    "is_learned" boolean not null default false,
    "is_shared" boolean not null default false,
    "last_synced_at" timestamp with time zone
      );


alter table "public"."decks" enable row level security;


  create table "public"."flags" (
    "id" uuid not null default gen_random_uuid(),
    "target_type" text not null,
    "target_id" text not null,
    "reporter_id" uuid not null,
    "reason" text not null,
    "description" text,
    "severity" text default 'low'::text,
    "status" text default 'pending'::text,
    "resolved_by" uuid,
    "resolution_note" text,
    "resolved_at" timestamp with time zone,
    "reporter_name" text,
    "reporter_avatar" text,
    "target_content" text,
    "target_owner_id" uuid,
    "target_owner_name" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_escalated" boolean default false,
    "moderator_notes" text,
    "resolution_reason" text,
    "resolved_by_name" text,
    "escalated_at" timestamp with time zone,
    "escalated_by" text,
    "escalated_by_name" text
      );


alter table "public"."flags" enable row level security;


  create table "public"."friend_requests" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "sender_id" uuid not null,
    "recipient_id" uuid not null,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."friend_requests" enable row level security;


  create table "public"."friends" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "friend_id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."friends" enable row level security;


  create table "public"."moderation_actions" (
    "id" uuid not null default gen_random_uuid(),
    "moderator_id" uuid not null,
    "moderator_name" text not null,
    "action_type" text not null,
    "target_type" text not null,
    "target_id" uuid not null,
    "reason" text not null,
    "additional_details" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."moderation_actions" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "type" text not null,
    "message" text not null,
    "is_read" boolean default false,
    "created_at" timestamp with time zone default now(),
    "related_user_id" uuid,
    "related_deck_id" uuid,
    "related_comment_id" uuid,
    "related_reply_id" uuid,
    "requester_display_name" text,
    "requester_avatar" text,
    "deck_name" text,
    "comment_text" text,
    "is_seen" boolean not null default false,
    "ticket_id" uuid
      );


alter table "public"."notifications" enable row level security;


  create table "public"."qr_codes" (
    "short_code" text not null,
    "deck_id" uuid not null,
    "user_id" uuid not null,
    "deck_name" text,
    "card_count" integer,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone
      );


alter table "public"."qr_codes" enable row level security;


  create table "public"."ratings" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "community_deck_id" uuid not null,
    "user_id" uuid not null,
    "rating" integer not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."ratings" enable row level security;


  create table "public"."referrals" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "referrer_id" uuid not null,
    "referrer_name" text,
    "invited_email" text,
    "status" text not null,
    "created_at" timestamp with time zone default now(),
    "accepted_at" timestamp with time zone,
    "referee_id" uuid
      );


alter table "public"."referrals" enable row level security;


  create table "public"."replies" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "comment_id" uuid not null,
    "user_id" uuid not null,
    "content" text not null,
    "is_flagged" boolean default false,
    "user_name" text,
    "user_display_name" text,
    "user_avatar" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_deleted" boolean not null default false,
    "deleted_at" boolean,
    "deleted_reason" text,
    "deleted_by" text,
    "deleted_by_display_name" text
      );


alter table "public"."replies" enable row level security;


  create table "public"."shared_decks" (
    "id" uuid not null default gen_random_uuid(),
    "share_id" uuid,
    "deck_id" uuid not null,
    "is_community_deck" boolean not null default false,
    "created_by" uuid not null,
    "is_active" boolean not null default true,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "deck_data" jsonb not null
      );


alter table "public"."shared_decks" enable row level security;


  create table "public"."study_sessions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "deck_id" uuid not null,
    "date" date not null,
    "correct_answers" integer default 0,
    "total_questions" integer default 0,
    "score" numeric(5,2) default 0,
    "duration_minutes" integer default 0,
    "created_at" timestamp with time zone default now(),
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "cards_studied" integer default 0,
    "correct_count" integer default 0,
    "incorrect_count" integer default 0,
    "skipped_count" integer default 0,
    "study_mode" text default 'review'::text,
    "time_spent_seconds" integer default 0,
    "session_data" jsonb default '{}'::jsonb,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."study_sessions" enable row level security;


  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "stripe_price_id" text,
    "tier" text not null,
    "status" text not null,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "is_manual" boolean default false,
    "is_lifetime" boolean default false,
    "source" text,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."ticket_actions" (
    "id" text not null default gen_random_uuid(),
    "ticket_id" uuid not null,
    "action_type" text not null,
    "performed_by" text not null,
    "performed_by_id" uuid,
    "timestamp" timestamp with time zone not null default now(),
    "details" jsonb default '{}'::jsonb
      );


alter table "public"."ticket_actions" enable row level security;


  create table "public"."ticket_comments" (
    "id" text not null,
    "ticket_id" uuid not null,
    "user_id" uuid not null,
    "user_name" text not null,
    "content" text not null,
    "mentions" jsonb default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ticket_comments" enable row level security;


  create table "public"."tickets" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text not null,
    "category" text not null,
    "priority" text default 'medium'::text,
    "status" text default 'open'::text,
    "created_by" uuid not null,
    "assigned_to" uuid,
    "related_flag_id" uuid,
    "related_user_id" uuid,
    "related_deck_id" uuid,
    "resolution_note" text,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_escalated" boolean not null default false,
    "related_user_display_name" text,
    "additional_details" text,
    "created_by_display_name" text,
    "related_card_id" uuid,
    "related_comment_id" uuid,
    "related_card_title" text,
    "related_deck_title" text,
    "related_comment_text" text,
    "flagged_user_id" uuid,
    "flagged_user_display_name" text,
    "assigned_to_display_name" text,
    "resolved_by" uuid,
    "resolved_by_display_name" text,
    "resolution_reason" text,
    "escalated_at" timestamp with time zone,
    "escalated_by_id" uuid,
    "escalated_by_display_name" text,
    "escalated_reason" text
      );


alter table "public"."tickets" enable row level security;


  create table "public"."user_achievements" (
    "user_id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "unlocked_achievement_ids" text[] default '{}'::text[],
    "decks_created" integer default 0,
    "total_cards" integer default 0,
    "decks_published" integer default 0,
    "decks_imported" integer default 0,
    "study_streak" integer default 0,
    "total_study_sessions" integer default 0,
    "cards_reviewed" integer default 0,
    "perfect_scores" integer default 0,
    "friends_added" integer default 0,
    "comments_left" integer default 0,
    "ratings_given" integer default 0,
    "deck_favorites" integer default 0,
    "deck_downloads" integer default 0,
    "deck_ratings" integer default 0,
    "ai_cards_generated" integer default 0,
    "total_study_minutes" integer default 0,
    "categories_used" integer default 0,
    "customized_deck_theme" boolean default false,
    "has_profile_picture" boolean default false,
    "studied_before_eight_am" boolean default false,
    "studied_after_midnight" boolean default false,
    "studied_stay_awake" boolean default false,
    "studied_three_hours_one_day" boolean default false,
    "flipped_card_five_times" boolean default false,
    "studied_on_low_battery" boolean default false,
    "slow_card_review" boolean default false,
    "created_multiple_choice_card" boolean default false,
    "created_type_answer_card" boolean default false,
    "created_image_card" boolean default false,
    "used_dark_mode" boolean default false,
    "used_ai" boolean default false,
    "is_premium" boolean default false,
    "perfect_score_marathon" boolean default false,
    "average_accuracy" integer default 0,
    "studied_sixty_minutes_nonstop" boolean default false,
    "completed_beginner_deck" boolean default false,
    "completed_intermediate_deck" boolean default false,
    "completed_advanced_deck" boolean default false,
    "completed_expert_deck" boolean default false,
    "completed_master_deck" boolean default false,
    "correct_answers_in_row" integer default 0,
    "studied_three_hours_in_one_day" boolean default false,
    "created_classic_flip_card" boolean default false
      );


alter table "public"."user_achievements" enable row level security;


  create table "public"."user_stats" (
    "user_id" uuid not null,
    "total_decks" integer default 0,
    "total_cards" integer default 0,
    "study_streak" integer default 0,
    "last_study_date" timestamp with time zone,
    "total_study_sessions" integer default 0,
    "average_score" numeric(5,2) default 0,
    "cards_reviewed" integer default 0,
    "correct_answers_in_row" integer default 0,
    "total_study_minutes" integer default 0,
    "perfect_scores" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_stats" enable row level security;


  create table "public"."users" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "email" text not null,
    "name" text,
    "display_name" text,
    "avatar_url" text,
    "decks_public" boolean default false,
    "subscription_tier" text default 'free'::text,
    "subscription_expiry" timestamp with time zone,
    "subscription_cancelled_at_period_end" boolean default false,
    "is_superuser" boolean default false,
    "is_moderator" boolean default false,
    "is_banned" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "terms_accepted_at" timestamp with time zone,
    "privacy_accepted_at" timestamp with time zone,
    "is_reported" boolean not null default false,
    "banned_reason" text,
    "banned_at" timestamp with time zone,
    "banned_by" uuid,
    "last_sign_in_at" timestamp with time zone,
    "stripe_customer_id" text,
    "stripe_subscription_id" text
      );


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX cards_pkey ON public.cards USING btree (id);

CREATE UNIQUE INDEX comment_likes_comment_id_user_id_key ON public.comment_likes USING btree (comment_id, user_id);

CREATE UNIQUE INDEX comment_likes_pkey ON public.comment_likes USING btree (id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX community_cards_pkey ON public.community_cards USING btree (id);

CREATE UNIQUE INDEX community_decks_pkey ON public.community_decks USING btree (id);

CREATE UNIQUE INDEX decks_pkey ON public.decks USING btree (id);

CREATE UNIQUE INDEX flags_pkey ON public.flags USING btree (id);

CREATE UNIQUE INDEX friend_requests_pkey ON public.friend_requests USING btree (id);

CREATE UNIQUE INDEX friend_requests_sender_id_recipient_id_key ON public.friend_requests USING btree (sender_id, recipient_id);

CREATE UNIQUE INDEX friendships_pkey ON public.friends USING btree (id);

CREATE UNIQUE INDEX friendships_user_id_friend_id_key ON public.friends USING btree (user_id, friend_id);

CREATE INDEX idx_cards_deck_id ON public.cards USING btree (deck_id);

CREATE INDEX idx_cards_deleted ON public.cards USING btree (is_deleted) WHERE (is_deleted = false);

CREATE INDEX idx_cards_favorite ON public.cards USING btree (deck_id, favorite) WHERE (favorite = true);

CREATE INDEX idx_cards_status ON public.cards USING btree (deck_id, status);

CREATE INDEX idx_comments_community_deck_id ON public.comments USING btree (community_deck_id);

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at DESC);

CREATE INDEX idx_comments_user_id ON public.comments USING btree (user_id);

CREATE INDEX idx_community_cards_deck_id ON public.community_cards USING btree (community_deck_id);

CREATE INDEX idx_community_decks_average_rating ON public.community_decks USING btree (average_rating DESC);

CREATE INDEX idx_community_decks_category ON public.community_decks USING btree (category);

CREATE INDEX idx_community_decks_featured ON public.community_decks USING btree (featured) WHERE (featured = true);

CREATE INDEX idx_community_decks_import_count ON public.community_decks USING btree (import_count DESC);

CREATE INDEX idx_community_decks_owner_id ON public.community_decks USING btree (owner_id);

CREATE INDEX idx_community_decks_published_at ON public.community_decks USING btree (published_at DESC);

CREATE INDEX idx_decks_creator ON public.decks USING btree (creator_id);

CREATE INDEX idx_decks_deleted ON public.decks USING btree (is_deleted) WHERE (is_deleted = false);

CREATE INDEX idx_decks_position ON public.decks USING btree (user_id, "position");

CREATE INDEX idx_decks_user_id ON public.decks USING btree (user_id);

CREATE INDEX idx_flags_created_at ON public.flags USING btree (created_at DESC);

CREATE INDEX idx_flags_severity ON public.flags USING btree (severity);

CREATE INDEX idx_flags_status ON public.flags USING btree (status);

CREATE INDEX idx_flags_target_type ON public.flags USING btree (target_type);

CREATE INDEX idx_friend_requests_recipient_id ON public.friend_requests USING btree (recipient_id);

CREATE INDEX idx_friend_requests_sender_id ON public.friend_requests USING btree (sender_id);

CREATE INDEX idx_friend_requests_status ON public.friend_requests USING btree (status);

CREATE INDEX idx_friendships_friend_id ON public.friends USING btree (friend_id);

CREATE INDEX idx_friendships_user_id ON public.friends USING btree (user_id);

CREATE INDEX idx_moderation_actions_created ON public.moderation_actions USING btree (created_at DESC);

CREATE INDEX idx_moderation_actions_moderator ON public.moderation_actions USING btree (moderator_id);

CREATE INDEX idx_moderation_actions_target ON public.moderation_actions USING btree (target_type, target_id);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (user_id, is_read);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_qr_codes_created_at ON public.qr_codes USING btree (created_at DESC);

CREATE INDEX idx_qr_codes_deck_id ON public.qr_codes USING btree (deck_id);

CREATE INDEX idx_ratings_community_deck_id ON public.ratings USING btree (community_deck_id);

CREATE INDEX idx_ratings_user_id ON public.ratings USING btree (user_id);

CREATE INDEX idx_replies_comment_id ON public.replies USING btree (comment_id);

CREATE INDEX idx_replies_created_at ON public.replies USING btree (created_at DESC);

CREATE INDEX idx_replies_user_id ON public.replies USING btree (user_id);

CREATE INDEX idx_shared_decks_created_by ON public.shared_decks USING btree (created_by);

CREATE INDEX idx_shared_decks_share_id ON public.shared_decks USING btree (share_id);

CREATE INDEX idx_study_sessions_date ON public.study_sessions USING btree (date DESC);

CREATE INDEX idx_study_sessions_deck_id ON public.study_sessions USING btree (deck_id);

CREATE INDEX idx_study_sessions_user_id ON public.study_sessions USING btree (user_id);

CREATE INDEX idx_ticket_actions_performed_by_id ON public.ticket_actions USING btree (performed_by_id);

CREATE INDEX idx_ticket_actions_ticket_id ON public.ticket_actions USING btree (ticket_id);

CREATE INDEX idx_ticket_actions_timestamp ON public.ticket_actions USING btree ("timestamp");

CREATE INDEX idx_ticket_comments_created_at ON public.ticket_comments USING btree (created_at);

CREATE INDEX idx_ticket_comments_ticket_id ON public.ticket_comments USING btree (ticket_id);

CREATE INDEX idx_ticket_comments_user_id ON public.ticket_comments USING btree (user_id);

CREATE INDEX idx_tickets_assigned_to ON public.tickets USING btree (assigned_to);

CREATE INDEX idx_tickets_created_at ON public.tickets USING btree (created_at DESC);

CREATE INDEX idx_tickets_priority ON public.tickets USING btree (priority);

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE INDEX idx_users_is_moderator ON public.users USING btree (is_moderator) WHERE (is_moderator = true);

CREATE INDEX idx_users_is_superuser ON public.users USING btree (is_superuser) WHERE (is_superuser = true);

CREATE UNIQUE INDEX moderation_actions_pkey ON public.moderation_actions USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX qr_codes_pkey ON public.qr_codes USING btree (short_code);

CREATE UNIQUE INDEX ratings_community_deck_id_user_id_key ON public.ratings USING btree (community_deck_id, user_id);

CREATE UNIQUE INDEX ratings_pkey ON public.ratings USING btree (id);

CREATE UNIQUE INDEX referrals_code_key ON public.referrals USING btree (code);

CREATE UNIQUE INDEX referrals_pkey ON public.referrals USING btree (id);

CREATE UNIQUE INDEX replies_pkey ON public.replies USING btree (id);

CREATE UNIQUE INDEX shared_decks_pkey ON public.shared_decks USING btree (id);

CREATE UNIQUE INDEX shared_decks_share_id_key ON public.shared_decks USING btree (share_id);

CREATE UNIQUE INDEX study_sessions_pkey ON public.study_sessions USING btree (id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX subscriptions_user_id_key ON public.subscriptions USING btree (user_id);

CREATE UNIQUE INDEX ticket_actions_pkey ON public.ticket_actions USING btree (id);

CREATE UNIQUE INDEX ticket_comments_pkey ON public.ticket_comments USING btree (id);

CREATE UNIQUE INDEX tickets_pkey ON public.tickets USING btree (id);

CREATE UNIQUE INDEX user_achievements_pkey ON public.user_achievements USING btree (user_id);

CREATE UNIQUE INDEX user_stats_pkey ON public.user_stats USING btree (user_id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."cards" add constraint "cards_pkey" PRIMARY KEY using index "cards_pkey";

alter table "public"."comment_likes" add constraint "comment_likes_pkey" PRIMARY KEY using index "comment_likes_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."community_cards" add constraint "community_cards_pkey" PRIMARY KEY using index "community_cards_pkey";

alter table "public"."community_decks" add constraint "community_decks_pkey" PRIMARY KEY using index "community_decks_pkey";

alter table "public"."decks" add constraint "decks_pkey" PRIMARY KEY using index "decks_pkey";

alter table "public"."flags" add constraint "flags_pkey" PRIMARY KEY using index "flags_pkey";

alter table "public"."friend_requests" add constraint "friend_requests_pkey" PRIMARY KEY using index "friend_requests_pkey";

alter table "public"."friends" add constraint "friendships_pkey" PRIMARY KEY using index "friendships_pkey";

alter table "public"."moderation_actions" add constraint "moderation_actions_pkey" PRIMARY KEY using index "moderation_actions_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."qr_codes" add constraint "qr_codes_pkey" PRIMARY KEY using index "qr_codes_pkey";

alter table "public"."ratings" add constraint "ratings_pkey" PRIMARY KEY using index "ratings_pkey";

alter table "public"."referrals" add constraint "referrals_pkey" PRIMARY KEY using index "referrals_pkey";

alter table "public"."replies" add constraint "replies_pkey" PRIMARY KEY using index "replies_pkey";

alter table "public"."shared_decks" add constraint "shared_decks_pkey" PRIMARY KEY using index "shared_decks_pkey";

alter table "public"."study_sessions" add constraint "study_sessions_pkey" PRIMARY KEY using index "study_sessions_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."ticket_actions" add constraint "ticket_actions_pkey" PRIMARY KEY using index "ticket_actions_pkey";

alter table "public"."ticket_comments" add constraint "ticket_comments_pkey" PRIMARY KEY using index "ticket_comments_pkey";

alter table "public"."tickets" add constraint "tickets_pkey" PRIMARY KEY using index "tickets_pkey";

alter table "public"."user_achievements" add constraint "user_achievements_pkey" PRIMARY KEY using index "user_achievements_pkey";

alter table "public"."user_stats" add constraint "user_stats_pkey" PRIMARY KEY using index "user_stats_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."cards" add constraint "cards_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE RESTRICT not valid;

alter table "public"."cards" validate constraint "cards_deck_id_fkey";

alter table "public"."comment_likes" add constraint "comment_likes_comment_id_user_id_key" UNIQUE using index "comment_likes_comment_id_user_id_key";

alter table "public"."comment_likes" add constraint "comment_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."comment_likes" validate constraint "comment_likes_user_id_fkey";

alter table "public"."comments" add constraint "comments_community_deck_id_fkey" FOREIGN KEY (community_deck_id) REFERENCES public.community_decks(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_community_deck_id_fkey";

alter table "public"."comments" add constraint "comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_user_id_fkey";

alter table "public"."community_cards" add constraint "community_cards_community_deck_id_fkey" FOREIGN KEY (community_deck_id) REFERENCES public.community_decks(id) ON DELETE CASCADE not valid;

alter table "public"."community_cards" validate constraint "community_cards_community_deck_id_fkey";

alter table "public"."community_decks" add constraint "community_decks_original_deck_id_fkey" FOREIGN KEY (original_deck_id) REFERENCES public.decks(id) ON DELETE SET NULL not valid;

alter table "public"."community_decks" validate constraint "community_decks_original_deck_id_fkey";

alter table "public"."community_decks" add constraint "community_decks_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."community_decks" validate constraint "community_decks_owner_id_fkey";

alter table "public"."decks" add constraint "decks_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES auth.users(id) not valid;

alter table "public"."decks" validate constraint "decks_creator_id_fkey";

alter table "public"."decks" add constraint "decks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."decks" validate constraint "decks_user_id_fkey";

alter table "public"."flags" add constraint "flags_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."flags" validate constraint "flags_reporter_id_fkey";

alter table "public"."flags" add constraint "flags_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."flags" validate constraint "flags_resolved_by_fkey";

alter table "public"."friend_requests" add constraint "friend_requests_check" CHECK ((sender_id <> recipient_id)) not valid;

alter table "public"."friend_requests" validate constraint "friend_requests_check";

alter table "public"."friend_requests" add constraint "friend_requests_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."friend_requests" validate constraint "friend_requests_recipient_id_fkey";

alter table "public"."friend_requests" add constraint "friend_requests_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."friend_requests" validate constraint "friend_requests_sender_id_fkey";

alter table "public"."friend_requests" add constraint "friend_requests_sender_id_recipient_id_key" UNIQUE using index "friend_requests_sender_id_recipient_id_key";

alter table "public"."friends" add constraint "friendships_check" CHECK ((user_id <> friend_id)) not valid;

alter table "public"."friends" validate constraint "friendships_check";

alter table "public"."friends" add constraint "friendships_friend_id_fkey" FOREIGN KEY (friend_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."friends" validate constraint "friendships_friend_id_fkey";

alter table "public"."friends" add constraint "friendships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."friends" validate constraint "friendships_user_id_fkey";

alter table "public"."friends" add constraint "friendships_user_id_friend_id_key" UNIQUE using index "friendships_user_id_friend_id_key";

alter table "public"."moderation_actions" add constraint "moderation_actions_moderator_id_fkey" FOREIGN KEY (moderator_id) REFERENCES public.users(id) not valid;

alter table "public"."moderation_actions" validate constraint "moderation_actions_moderator_id_fkey";

alter table "public"."notifications" add constraint "notifications_related_user_id_fkey" FOREIGN KEY (related_user_id) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."notifications" validate constraint "notifications_related_user_id_fkey";

alter table "public"."notifications" add constraint "notifications_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) not valid;

alter table "public"."notifications" validate constraint "notifications_ticket_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."qr_codes" add constraint "qr_codes_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE not valid;

alter table "public"."qr_codes" validate constraint "qr_codes_deck_id_fkey";

alter table "public"."qr_codes" add constraint "qr_codes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."qr_codes" validate constraint "qr_codes_user_id_fkey";

alter table "public"."ratings" add constraint "ratings_community_deck_id_fkey" FOREIGN KEY (community_deck_id) REFERENCES public.community_decks(id) ON DELETE CASCADE not valid;

alter table "public"."ratings" validate constraint "ratings_community_deck_id_fkey";

alter table "public"."ratings" add constraint "ratings_community_deck_id_user_id_key" UNIQUE using index "ratings_community_deck_id_user_id_key";

alter table "public"."ratings" add constraint "ratings_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."ratings" validate constraint "ratings_rating_check";

alter table "public"."ratings" add constraint "ratings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."ratings" validate constraint "ratings_user_id_fkey";

alter table "public"."referrals" add constraint "referrals_code_key" UNIQUE using index "referrals_code_key";

alter table "public"."referrals" add constraint "referrals_referee_id_fkey" FOREIGN KEY (referee_id) REFERENCES auth.users(id) not valid;

alter table "public"."referrals" validate constraint "referrals_referee_id_fkey";

alter table "public"."referrals" add constraint "referrals_referrer_id_fkey" FOREIGN KEY (referrer_id) REFERENCES auth.users(id) not valid;

alter table "public"."referrals" validate constraint "referrals_referrer_id_fkey";

alter table "public"."replies" add constraint "replies_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE not valid;

alter table "public"."replies" validate constraint "replies_comment_id_fkey";

alter table "public"."replies" add constraint "replies_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."replies" validate constraint "replies_user_id_fkey";

alter table "public"."shared_decks" add constraint "shared_decks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."shared_decks" validate constraint "shared_decks_created_by_fkey";

alter table "public"."shared_decks" add constraint "shared_decks_share_id_key" UNIQUE using index "shared_decks_share_id_key";

alter table "public"."study_sessions" add constraint "study_sessions_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE not valid;

alter table "public"."study_sessions" validate constraint "study_sessions_deck_id_fkey";

alter table "public"."study_sessions" add constraint "study_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."study_sessions" validate constraint "study_sessions_user_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'canceled'::text, 'expired'::text, 'past_due'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_status_check";

alter table "public"."subscriptions" add constraint "subscriptions_tier_check" CHECK ((tier = ANY (ARRAY['free'::text, 'monthly'::text, 'annual'::text, 'lifetime'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_tier_check";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_user_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_key" UNIQUE using index "subscriptions_user_id_key";

alter table "public"."ticket_actions" add constraint "ticket_actions_performed_by_id_fkey" FOREIGN KEY (performed_by_id) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."ticket_actions" validate constraint "ticket_actions_performed_by_id_fkey";

alter table "public"."ticket_actions" add constraint "ticket_actions_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_actions" validate constraint "ticket_actions_ticket_id_fkey";

alter table "public"."ticket_comments" add constraint "ticket_comments_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_comments" validate constraint "ticket_comments_ticket_id_fkey";

alter table "public"."ticket_comments" add constraint "ticket_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_comments" validate constraint "ticket_comments_user_id_fkey";

alter table "public"."tickets" add constraint "tickets_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_assigned_to_fkey";

alter table "public"."tickets" add constraint "tickets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."tickets" validate constraint "tickets_created_by_fkey";

alter table "public"."tickets" add constraint "tickets_related_flag_id_fkey" FOREIGN KEY (related_flag_id) REFERENCES public.flags(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_related_flag_id_fkey";

alter table "public"."tickets" add constraint "tickets_related_user_id_fkey" FOREIGN KEY (related_user_id) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_related_user_id_fkey";

alter table "public"."user_achievements" add constraint "user_achievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_achievements" validate constraint "user_achievements_user_id_fkey";

alter table "public"."user_stats" add constraint "user_stats_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_stats" validate constraint "user_stats_user_id_fkey";

alter table "public"."users" add constraint "users_banned_by_fkey" FOREIGN KEY (banned_by) REFERENCES public.users(id) not valid;

alter table "public"."users" validate constraint "users_banned_by_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_user_achievements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.user_achievements (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_user_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_name TEXT;
  user_avatar TEXT;
  is_oauth_signup BOOLEAN;
BEGIN
  is_oauth_signup := NEW.raw_app_meta_data->>'provider' IS NOT NULL 
                     AND NEW.raw_app_meta_data->>'provider' != 'email';

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- Only insert into users table
  INSERT INTO public.users (
    id, email, name, display_name, avatar_url,
    decks_public, subscription_tier, is_superuser, is_moderator,
    is_banned, is_reported, terms_accepted_at, privacy_accepted_at,
    created_at, updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    user_name, 
    CASE WHEN is_oauth_signup THEN NULL ELSE user_name END,
    user_avatar,
    false, 'free', false, false, false, false,
    NOW(), NOW(), NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_community_deck_version()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only run this logic on the community_decks table
  IF TG_TABLE_NAME != 'community_decks_8a1502a9' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.version = COALESCE(NEW.version, 1);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only increment if actual content changed
    IF (OLD.deck_name IS DISTINCT FROM NEW.deck_name OR
        OLD.description IS DISTINCT FROM NEW.description OR
        OLD.cards IS DISTINCT FROM NEW.cards OR
        OLD.category IS DISTINCT FROM NEW.category OR
        OLD.tags IS DISTINCT FROM NEW.tags) THEN
      NEW.version = COALESCE(OLD.version, 0) + 1;
    ELSE
      NEW.version = OLD.version;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_friends_with(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM friendships 
        WHERE user_id = auth.uid() 
        AND friend_id = target_user_id 
        AND status = 'accepted'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_moderator_or_superuser()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND (is_moderator = true OR is_superuser = true)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_community_deck_card_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE community_decks
    SET card_count = (
        SELECT COUNT(*)
        FROM community_cards
        WHERE community_deck_id = COALESCE(NEW.community_deck_id, OLD.community_deck_id)
    )
    WHERE id = COALESCE(NEW.community_deck_id, OLD.community_deck_id);
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_community_deck_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    UPDATE community_decks 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.community_deck_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      -- Comment was deleted
      UPDATE community_decks 
      SET comment_count = comment_count - 1 
      WHERE id = NEW.community_deck_id;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      -- Comment was restored
      UPDATE community_decks 
      SET comment_count = comment_count + 1 
      WHERE id = NEW.community_deck_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = false THEN
    UPDATE community_decks 
    SET comment_count = comment_count - 1 
    WHERE id = OLD.community_deck_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_community_deck_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE community_decks
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM ratings
            WHERE community_deck_id = COALESCE(NEW.community_deck_id, OLD.community_deck_id)
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM ratings
            WHERE community_deck_id = COALESCE(NEW.community_deck_id, OLD.community_deck_id)
        )
    WHERE id = COALESCE(NEW.community_deck_id, OLD.community_deck_id);
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_deck_card_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (tg_op = 'INSERT') then
    update decks
    set card_count = card_count + 1
    where id = new.deck_id;
    return new;

  elsif (tg_op = 'DELETE') then
    update decks
    set card_count = greatest(card_count - 1, 0)
    where id = old.deck_id;
    return old;

  end if;

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_deck_content_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update decks
  set content_updated_at = now()
  where id = coalesce(new.deck_id, old.deck_id);
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."cards" to "anon";

grant insert on table "public"."cards" to "anon";

grant references on table "public"."cards" to "anon";

grant select on table "public"."cards" to "anon";

grant trigger on table "public"."cards" to "anon";

grant truncate on table "public"."cards" to "anon";

grant update on table "public"."cards" to "anon";

grant delete on table "public"."cards" to "authenticated";

grant insert on table "public"."cards" to "authenticated";

grant references on table "public"."cards" to "authenticated";

grant select on table "public"."cards" to "authenticated";

grant trigger on table "public"."cards" to "authenticated";

grant truncate on table "public"."cards" to "authenticated";

grant update on table "public"."cards" to "authenticated";

grant delete on table "public"."cards" to "service_role";

grant insert on table "public"."cards" to "service_role";

grant references on table "public"."cards" to "service_role";

grant select on table "public"."cards" to "service_role";

grant trigger on table "public"."cards" to "service_role";

grant truncate on table "public"."cards" to "service_role";

grant update on table "public"."cards" to "service_role";

grant delete on table "public"."comment_likes" to "anon";

grant insert on table "public"."comment_likes" to "anon";

grant references on table "public"."comment_likes" to "anon";

grant select on table "public"."comment_likes" to "anon";

grant trigger on table "public"."comment_likes" to "anon";

grant truncate on table "public"."comment_likes" to "anon";

grant update on table "public"."comment_likes" to "anon";

grant delete on table "public"."comment_likes" to "authenticated";

grant insert on table "public"."comment_likes" to "authenticated";

grant references on table "public"."comment_likes" to "authenticated";

grant select on table "public"."comment_likes" to "authenticated";

grant trigger on table "public"."comment_likes" to "authenticated";

grant truncate on table "public"."comment_likes" to "authenticated";

grant update on table "public"."comment_likes" to "authenticated";

grant delete on table "public"."comment_likes" to "service_role";

grant insert on table "public"."comment_likes" to "service_role";

grant references on table "public"."comment_likes" to "service_role";

grant select on table "public"."comment_likes" to "service_role";

grant trigger on table "public"."comment_likes" to "service_role";

grant truncate on table "public"."comment_likes" to "service_role";

grant update on table "public"."comment_likes" to "service_role";

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";

grant insert on table "public"."comments" to "authenticated";

grant references on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";

grant delete on table "public"."community_cards" to "anon";

grant insert on table "public"."community_cards" to "anon";

grant references on table "public"."community_cards" to "anon";

grant select on table "public"."community_cards" to "anon";

grant trigger on table "public"."community_cards" to "anon";

grant truncate on table "public"."community_cards" to "anon";

grant update on table "public"."community_cards" to "anon";

grant delete on table "public"."community_cards" to "authenticated";

grant insert on table "public"."community_cards" to "authenticated";

grant references on table "public"."community_cards" to "authenticated";

grant select on table "public"."community_cards" to "authenticated";

grant trigger on table "public"."community_cards" to "authenticated";

grant truncate on table "public"."community_cards" to "authenticated";

grant update on table "public"."community_cards" to "authenticated";

grant delete on table "public"."community_cards" to "service_role";

grant insert on table "public"."community_cards" to "service_role";

grant references on table "public"."community_cards" to "service_role";

grant select on table "public"."community_cards" to "service_role";

grant trigger on table "public"."community_cards" to "service_role";

grant truncate on table "public"."community_cards" to "service_role";

grant update on table "public"."community_cards" to "service_role";

grant delete on table "public"."community_decks" to "anon";

grant insert on table "public"."community_decks" to "anon";

grant references on table "public"."community_decks" to "anon";

grant select on table "public"."community_decks" to "anon";

grant trigger on table "public"."community_decks" to "anon";

grant truncate on table "public"."community_decks" to "anon";

grant update on table "public"."community_decks" to "anon";

grant delete on table "public"."community_decks" to "authenticated";

grant insert on table "public"."community_decks" to "authenticated";

grant references on table "public"."community_decks" to "authenticated";

grant select on table "public"."community_decks" to "authenticated";

grant trigger on table "public"."community_decks" to "authenticated";

grant truncate on table "public"."community_decks" to "authenticated";

grant update on table "public"."community_decks" to "authenticated";

grant delete on table "public"."community_decks" to "service_role";

grant insert on table "public"."community_decks" to "service_role";

grant references on table "public"."community_decks" to "service_role";

grant select on table "public"."community_decks" to "service_role";

grant trigger on table "public"."community_decks" to "service_role";

grant truncate on table "public"."community_decks" to "service_role";

grant update on table "public"."community_decks" to "service_role";

grant delete on table "public"."decks" to "anon";

grant insert on table "public"."decks" to "anon";

grant references on table "public"."decks" to "anon";

grant select on table "public"."decks" to "anon";

grant trigger on table "public"."decks" to "anon";

grant truncate on table "public"."decks" to "anon";

grant update on table "public"."decks" to "anon";

grant delete on table "public"."decks" to "authenticated";

grant insert on table "public"."decks" to "authenticated";

grant references on table "public"."decks" to "authenticated";

grant select on table "public"."decks" to "authenticated";

grant trigger on table "public"."decks" to "authenticated";

grant truncate on table "public"."decks" to "authenticated";

grant update on table "public"."decks" to "authenticated";

grant delete on table "public"."decks" to "service_role";

grant insert on table "public"."decks" to "service_role";

grant references on table "public"."decks" to "service_role";

grant select on table "public"."decks" to "service_role";

grant trigger on table "public"."decks" to "service_role";

grant truncate on table "public"."decks" to "service_role";

grant update on table "public"."decks" to "service_role";

grant delete on table "public"."flags" to "anon";

grant insert on table "public"."flags" to "anon";

grant references on table "public"."flags" to "anon";

grant select on table "public"."flags" to "anon";

grant trigger on table "public"."flags" to "anon";

grant truncate on table "public"."flags" to "anon";

grant update on table "public"."flags" to "anon";

grant delete on table "public"."flags" to "authenticated";

grant insert on table "public"."flags" to "authenticated";

grant references on table "public"."flags" to "authenticated";

grant select on table "public"."flags" to "authenticated";

grant trigger on table "public"."flags" to "authenticated";

grant truncate on table "public"."flags" to "authenticated";

grant update on table "public"."flags" to "authenticated";

grant delete on table "public"."flags" to "service_role";

grant insert on table "public"."flags" to "service_role";

grant references on table "public"."flags" to "service_role";

grant select on table "public"."flags" to "service_role";

grant trigger on table "public"."flags" to "service_role";

grant truncate on table "public"."flags" to "service_role";

grant update on table "public"."flags" to "service_role";

grant delete on table "public"."friend_requests" to "anon";

grant insert on table "public"."friend_requests" to "anon";

grant references on table "public"."friend_requests" to "anon";

grant select on table "public"."friend_requests" to "anon";

grant trigger on table "public"."friend_requests" to "anon";

grant truncate on table "public"."friend_requests" to "anon";

grant update on table "public"."friend_requests" to "anon";

grant delete on table "public"."friend_requests" to "authenticated";

grant insert on table "public"."friend_requests" to "authenticated";

grant references on table "public"."friend_requests" to "authenticated";

grant select on table "public"."friend_requests" to "authenticated";

grant trigger on table "public"."friend_requests" to "authenticated";

grant truncate on table "public"."friend_requests" to "authenticated";

grant update on table "public"."friend_requests" to "authenticated";

grant delete on table "public"."friend_requests" to "service_role";

grant insert on table "public"."friend_requests" to "service_role";

grant references on table "public"."friend_requests" to "service_role";

grant select on table "public"."friend_requests" to "service_role";

grant trigger on table "public"."friend_requests" to "service_role";

grant truncate on table "public"."friend_requests" to "service_role";

grant update on table "public"."friend_requests" to "service_role";

grant delete on table "public"."friends" to "anon";

grant insert on table "public"."friends" to "anon";

grant references on table "public"."friends" to "anon";

grant select on table "public"."friends" to "anon";

grant trigger on table "public"."friends" to "anon";

grant truncate on table "public"."friends" to "anon";

grant update on table "public"."friends" to "anon";

grant delete on table "public"."friends" to "authenticated";

grant insert on table "public"."friends" to "authenticated";

grant references on table "public"."friends" to "authenticated";

grant select on table "public"."friends" to "authenticated";

grant trigger on table "public"."friends" to "authenticated";

grant truncate on table "public"."friends" to "authenticated";

grant update on table "public"."friends" to "authenticated";

grant delete on table "public"."friends" to "service_role";

grant insert on table "public"."friends" to "service_role";

grant references on table "public"."friends" to "service_role";

grant select on table "public"."friends" to "service_role";

grant trigger on table "public"."friends" to "service_role";

grant truncate on table "public"."friends" to "service_role";

grant update on table "public"."friends" to "service_role";

grant delete on table "public"."moderation_actions" to "anon";

grant insert on table "public"."moderation_actions" to "anon";

grant references on table "public"."moderation_actions" to "anon";

grant select on table "public"."moderation_actions" to "anon";

grant trigger on table "public"."moderation_actions" to "anon";

grant truncate on table "public"."moderation_actions" to "anon";

grant update on table "public"."moderation_actions" to "anon";

grant delete on table "public"."moderation_actions" to "authenticated";

grant insert on table "public"."moderation_actions" to "authenticated";

grant references on table "public"."moderation_actions" to "authenticated";

grant select on table "public"."moderation_actions" to "authenticated";

grant trigger on table "public"."moderation_actions" to "authenticated";

grant truncate on table "public"."moderation_actions" to "authenticated";

grant update on table "public"."moderation_actions" to "authenticated";

grant delete on table "public"."moderation_actions" to "service_role";

grant insert on table "public"."moderation_actions" to "service_role";

grant references on table "public"."moderation_actions" to "service_role";

grant select on table "public"."moderation_actions" to "service_role";

grant trigger on table "public"."moderation_actions" to "service_role";

grant truncate on table "public"."moderation_actions" to "service_role";

grant update on table "public"."moderation_actions" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."qr_codes" to "anon";

grant insert on table "public"."qr_codes" to "anon";

grant references on table "public"."qr_codes" to "anon";

grant select on table "public"."qr_codes" to "anon";

grant trigger on table "public"."qr_codes" to "anon";

grant truncate on table "public"."qr_codes" to "anon";

grant update on table "public"."qr_codes" to "anon";

grant delete on table "public"."qr_codes" to "authenticated";

grant insert on table "public"."qr_codes" to "authenticated";

grant references on table "public"."qr_codes" to "authenticated";

grant select on table "public"."qr_codes" to "authenticated";

grant trigger on table "public"."qr_codes" to "authenticated";

grant truncate on table "public"."qr_codes" to "authenticated";

grant update on table "public"."qr_codes" to "authenticated";

grant delete on table "public"."qr_codes" to "service_role";

grant insert on table "public"."qr_codes" to "service_role";

grant references on table "public"."qr_codes" to "service_role";

grant select on table "public"."qr_codes" to "service_role";

grant trigger on table "public"."qr_codes" to "service_role";

grant truncate on table "public"."qr_codes" to "service_role";

grant update on table "public"."qr_codes" to "service_role";

grant delete on table "public"."ratings" to "anon";

grant insert on table "public"."ratings" to "anon";

grant references on table "public"."ratings" to "anon";

grant select on table "public"."ratings" to "anon";

grant trigger on table "public"."ratings" to "anon";

grant truncate on table "public"."ratings" to "anon";

grant update on table "public"."ratings" to "anon";

grant delete on table "public"."ratings" to "authenticated";

grant insert on table "public"."ratings" to "authenticated";

grant references on table "public"."ratings" to "authenticated";

grant select on table "public"."ratings" to "authenticated";

grant trigger on table "public"."ratings" to "authenticated";

grant truncate on table "public"."ratings" to "authenticated";

grant update on table "public"."ratings" to "authenticated";

grant delete on table "public"."ratings" to "service_role";

grant insert on table "public"."ratings" to "service_role";

grant references on table "public"."ratings" to "service_role";

grant select on table "public"."ratings" to "service_role";

grant trigger on table "public"."ratings" to "service_role";

grant truncate on table "public"."ratings" to "service_role";

grant update on table "public"."ratings" to "service_role";

grant delete on table "public"."referrals" to "anon";

grant insert on table "public"."referrals" to "anon";

grant references on table "public"."referrals" to "anon";

grant select on table "public"."referrals" to "anon";

grant trigger on table "public"."referrals" to "anon";

grant truncate on table "public"."referrals" to "anon";

grant update on table "public"."referrals" to "anon";

grant delete on table "public"."referrals" to "authenticated";

grant insert on table "public"."referrals" to "authenticated";

grant references on table "public"."referrals" to "authenticated";

grant select on table "public"."referrals" to "authenticated";

grant trigger on table "public"."referrals" to "authenticated";

grant truncate on table "public"."referrals" to "authenticated";

grant update on table "public"."referrals" to "authenticated";

grant delete on table "public"."referrals" to "service_role";

grant insert on table "public"."referrals" to "service_role";

grant references on table "public"."referrals" to "service_role";

grant select on table "public"."referrals" to "service_role";

grant trigger on table "public"."referrals" to "service_role";

grant truncate on table "public"."referrals" to "service_role";

grant update on table "public"."referrals" to "service_role";

grant delete on table "public"."replies" to "anon";

grant insert on table "public"."replies" to "anon";

grant references on table "public"."replies" to "anon";

grant select on table "public"."replies" to "anon";

grant trigger on table "public"."replies" to "anon";

grant truncate on table "public"."replies" to "anon";

grant update on table "public"."replies" to "anon";

grant delete on table "public"."replies" to "authenticated";

grant insert on table "public"."replies" to "authenticated";

grant references on table "public"."replies" to "authenticated";

grant select on table "public"."replies" to "authenticated";

grant trigger on table "public"."replies" to "authenticated";

grant truncate on table "public"."replies" to "authenticated";

grant update on table "public"."replies" to "authenticated";

grant delete on table "public"."replies" to "service_role";

grant insert on table "public"."replies" to "service_role";

grant references on table "public"."replies" to "service_role";

grant select on table "public"."replies" to "service_role";

grant trigger on table "public"."replies" to "service_role";

grant truncate on table "public"."replies" to "service_role";

grant update on table "public"."replies" to "service_role";

grant delete on table "public"."shared_decks" to "anon";

grant insert on table "public"."shared_decks" to "anon";

grant references on table "public"."shared_decks" to "anon";

grant select on table "public"."shared_decks" to "anon";

grant trigger on table "public"."shared_decks" to "anon";

grant truncate on table "public"."shared_decks" to "anon";

grant update on table "public"."shared_decks" to "anon";

grant delete on table "public"."shared_decks" to "authenticated";

grant insert on table "public"."shared_decks" to "authenticated";

grant references on table "public"."shared_decks" to "authenticated";

grant select on table "public"."shared_decks" to "authenticated";

grant trigger on table "public"."shared_decks" to "authenticated";

grant truncate on table "public"."shared_decks" to "authenticated";

grant update on table "public"."shared_decks" to "authenticated";

grant delete on table "public"."shared_decks" to "service_role";

grant insert on table "public"."shared_decks" to "service_role";

grant references on table "public"."shared_decks" to "service_role";

grant select on table "public"."shared_decks" to "service_role";

grant trigger on table "public"."shared_decks" to "service_role";

grant truncate on table "public"."shared_decks" to "service_role";

grant update on table "public"."shared_decks" to "service_role";

grant delete on table "public"."study_sessions" to "anon";

grant insert on table "public"."study_sessions" to "anon";

grant references on table "public"."study_sessions" to "anon";

grant select on table "public"."study_sessions" to "anon";

grant trigger on table "public"."study_sessions" to "anon";

grant truncate on table "public"."study_sessions" to "anon";

grant update on table "public"."study_sessions" to "anon";

grant delete on table "public"."study_sessions" to "authenticated";

grant insert on table "public"."study_sessions" to "authenticated";

grant references on table "public"."study_sessions" to "authenticated";

grant select on table "public"."study_sessions" to "authenticated";

grant trigger on table "public"."study_sessions" to "authenticated";

grant truncate on table "public"."study_sessions" to "authenticated";

grant update on table "public"."study_sessions" to "authenticated";

grant delete on table "public"."study_sessions" to "service_role";

grant insert on table "public"."study_sessions" to "service_role";

grant references on table "public"."study_sessions" to "service_role";

grant select on table "public"."study_sessions" to "service_role";

grant trigger on table "public"."study_sessions" to "service_role";

grant truncate on table "public"."study_sessions" to "service_role";

grant update on table "public"."study_sessions" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."ticket_actions" to "anon";

grant insert on table "public"."ticket_actions" to "anon";

grant references on table "public"."ticket_actions" to "anon";

grant select on table "public"."ticket_actions" to "anon";

grant trigger on table "public"."ticket_actions" to "anon";

grant truncate on table "public"."ticket_actions" to "anon";

grant update on table "public"."ticket_actions" to "anon";

grant delete on table "public"."ticket_actions" to "authenticated";

grant insert on table "public"."ticket_actions" to "authenticated";

grant references on table "public"."ticket_actions" to "authenticated";

grant select on table "public"."ticket_actions" to "authenticated";

grant trigger on table "public"."ticket_actions" to "authenticated";

grant truncate on table "public"."ticket_actions" to "authenticated";

grant update on table "public"."ticket_actions" to "authenticated";

grant delete on table "public"."ticket_actions" to "service_role";

grant insert on table "public"."ticket_actions" to "service_role";

grant references on table "public"."ticket_actions" to "service_role";

grant select on table "public"."ticket_actions" to "service_role";

grant trigger on table "public"."ticket_actions" to "service_role";

grant truncate on table "public"."ticket_actions" to "service_role";

grant update on table "public"."ticket_actions" to "service_role";

grant delete on table "public"."ticket_comments" to "anon";

grant insert on table "public"."ticket_comments" to "anon";

grant references on table "public"."ticket_comments" to "anon";

grant select on table "public"."ticket_comments" to "anon";

grant trigger on table "public"."ticket_comments" to "anon";

grant truncate on table "public"."ticket_comments" to "anon";

grant update on table "public"."ticket_comments" to "anon";

grant delete on table "public"."ticket_comments" to "authenticated";

grant insert on table "public"."ticket_comments" to "authenticated";

grant references on table "public"."ticket_comments" to "authenticated";

grant select on table "public"."ticket_comments" to "authenticated";

grant trigger on table "public"."ticket_comments" to "authenticated";

grant truncate on table "public"."ticket_comments" to "authenticated";

grant update on table "public"."ticket_comments" to "authenticated";

grant delete on table "public"."ticket_comments" to "service_role";

grant insert on table "public"."ticket_comments" to "service_role";

grant references on table "public"."ticket_comments" to "service_role";

grant select on table "public"."ticket_comments" to "service_role";

grant trigger on table "public"."ticket_comments" to "service_role";

grant truncate on table "public"."ticket_comments" to "service_role";

grant update on table "public"."ticket_comments" to "service_role";

grant delete on table "public"."tickets" to "anon";

grant insert on table "public"."tickets" to "anon";

grant references on table "public"."tickets" to "anon";

grant select on table "public"."tickets" to "anon";

grant trigger on table "public"."tickets" to "anon";

grant truncate on table "public"."tickets" to "anon";

grant update on table "public"."tickets" to "anon";

grant delete on table "public"."tickets" to "authenticated";

grant insert on table "public"."tickets" to "authenticated";

grant references on table "public"."tickets" to "authenticated";

grant select on table "public"."tickets" to "authenticated";

grant trigger on table "public"."tickets" to "authenticated";

grant truncate on table "public"."tickets" to "authenticated";

grant update on table "public"."tickets" to "authenticated";

grant delete on table "public"."tickets" to "service_role";

grant insert on table "public"."tickets" to "service_role";

grant references on table "public"."tickets" to "service_role";

grant select on table "public"."tickets" to "service_role";

grant trigger on table "public"."tickets" to "service_role";

grant truncate on table "public"."tickets" to "service_role";

grant update on table "public"."tickets" to "service_role";

grant delete on table "public"."user_achievements" to "anon";

grant insert on table "public"."user_achievements" to "anon";

grant references on table "public"."user_achievements" to "anon";

grant select on table "public"."user_achievements" to "anon";

grant trigger on table "public"."user_achievements" to "anon";

grant truncate on table "public"."user_achievements" to "anon";

grant update on table "public"."user_achievements" to "anon";

grant delete on table "public"."user_achievements" to "authenticated";

grant insert on table "public"."user_achievements" to "authenticated";

grant references on table "public"."user_achievements" to "authenticated";

grant select on table "public"."user_achievements" to "authenticated";

grant trigger on table "public"."user_achievements" to "authenticated";

grant truncate on table "public"."user_achievements" to "authenticated";

grant update on table "public"."user_achievements" to "authenticated";

grant delete on table "public"."user_achievements" to "service_role";

grant insert on table "public"."user_achievements" to "service_role";

grant references on table "public"."user_achievements" to "service_role";

grant select on table "public"."user_achievements" to "service_role";

grant trigger on table "public"."user_achievements" to "service_role";

grant truncate on table "public"."user_achievements" to "service_role";

grant update on table "public"."user_achievements" to "service_role";

grant delete on table "public"."user_stats" to "anon";

grant insert on table "public"."user_stats" to "anon";

grant references on table "public"."user_stats" to "anon";

grant select on table "public"."user_stats" to "anon";

grant trigger on table "public"."user_stats" to "anon";

grant truncate on table "public"."user_stats" to "anon";

grant update on table "public"."user_stats" to "anon";

grant delete on table "public"."user_stats" to "authenticated";

grant insert on table "public"."user_stats" to "authenticated";

grant references on table "public"."user_stats" to "authenticated";

grant select on table "public"."user_stats" to "authenticated";

grant trigger on table "public"."user_stats" to "authenticated";

grant truncate on table "public"."user_stats" to "authenticated";

grant update on table "public"."user_stats" to "authenticated";

grant delete on table "public"."user_stats" to "service_role";

grant insert on table "public"."user_stats" to "service_role";

grant references on table "public"."user_stats" to "service_role";

grant select on table "public"."user_stats" to "service_role";

grant trigger on table "public"."user_stats" to "service_role";

grant truncate on table "public"."user_stats" to "service_role";

grant update on table "public"."user_stats" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "Users can delete cards in their own decks"
  on "public"."cards"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.decks
  WHERE ((decks.id = cards.deck_id) AND (decks.user_id = auth.uid())))));



  create policy "Users can insert cards in their own decks"
  on "public"."cards"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.decks
  WHERE ((decks.id = cards.deck_id) AND (decks.user_id = auth.uid())))));



  create policy "Users can update cards in their own decks"
  on "public"."cards"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.decks
  WHERE ((decks.id = cards.deck_id) AND (decks.user_id = auth.uid())))));



  create policy "Users can view cards in friends' public decks"
  on "public"."cards"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.decks
     JOIN public.users ON ((users.id = decks.user_id)))
  WHERE ((decks.id = cards.deck_id) AND public.is_friends_with(decks.user_id) AND (users.decks_public = true)))));



  create policy "Users can view cards in their own decks"
  on "public"."cards"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.decks
  WHERE ((decks.id = cards.deck_id) AND (decks.user_id = auth.uid())))));



  create policy "Anyone can view comments"
  on "public"."comments"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can create comments"
  on "public"."comments"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Moderators can delete any comment"
  on "public"."comments"
  as permissive
  for delete
  to public
using (public.is_moderator_or_superuser());



  create policy "Moderators can update any comment"
  on "public"."comments"
  as permissive
  for update
  to public
using (public.is_moderator_or_superuser());



  create policy "Users can delete their own comments"
  on "public"."comments"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own comments"
  on "public"."comments"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Anyone can view community cards"
  on "public"."community_cards"
  as permissive
  for select
  to public
using (true);



  create policy "Owners can delete cards in their community decks"
  on "public"."community_cards"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.community_decks
  WHERE ((community_decks.id = community_cards.community_deck_id) AND (community_decks.owner_id = auth.uid())))));



  create policy "Owners can insert cards in their community decks"
  on "public"."community_cards"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.community_decks
  WHERE ((community_decks.id = community_cards.community_deck_id) AND (community_decks.owner_id = auth.uid())))));



  create policy "Owners can update cards in their community decks"
  on "public"."community_cards"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.community_decks
  WHERE ((community_decks.id = community_cards.community_deck_id) AND (community_decks.owner_id = auth.uid())))));



  create policy "Anyone can view community decks"
  on "public"."community_decks"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can publish community decks"
  on "public"."community_decks"
  as permissive
  for insert
  to public
with check ((auth.uid() = owner_id));



  create policy "Moderators can delete any community deck"
  on "public"."community_decks"
  as permissive
  for delete
  to public
using (public.is_moderator_or_superuser());



  create policy "Moderators can update any community deck"
  on "public"."community_decks"
  as permissive
  for update
  to public
using (public.is_moderator_or_superuser());



  create policy "Owners can delete their community decks"
  on "public"."community_decks"
  as permissive
  for delete
  to public
using ((auth.uid() = owner_id));



  create policy "Owners can update their community decks"
  on "public"."community_decks"
  as permissive
  for update
  to public
using ((auth.uid() = owner_id));



  create policy "Users can create their own decks"
  on "public"."decks"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own decks"
  on "public"."decks"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own decks"
  on "public"."decks"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view friends' public decks"
  on "public"."decks"
  as permissive
  for select
  to public
using ((public.is_friends_with(user_id) AND (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = decks.user_id) AND (users.decks_public = true))))));



  create policy "Users can view their own decks"
  on "public"."decks"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Authenticated users can create flags"
  on "public"."flags"
  as permissive
  for insert
  to public
with check ((auth.uid() = reporter_id));



  create policy "Moderators can delete flags"
  on "public"."flags"
  as permissive
  for delete
  to public
using (public.is_moderator_or_superuser());



  create policy "Moderators can update flags"
  on "public"."flags"
  as permissive
  for update
  to public
using (public.is_moderator_or_superuser());



  create policy "Moderators can view all flags"
  on "public"."flags"
  as permissive
  for select
  to public
using (public.is_moderator_or_superuser());



  create policy "Users can view their own flags"
  on "public"."flags"
  as permissive
  for select
  to public
using ((auth.uid() = reporter_id));



  create policy "Service role can manage all friend requests"
  on "public"."friend_requests"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role full access"
  on "public"."friend_requests"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Users can delete their friend requests"
  on "public"."friend_requests"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));



  create policy "Users can send friend requests"
  on "public"."friend_requests"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = sender_id));



  create policy "Users can update their received requests"
  on "public"."friend_requests"
  as permissive
  for update
  to authenticated
using ((auth.uid() = recipient_id))
with check ((auth.uid() = recipient_id));



  create policy "Users can view their friend requests"
  on "public"."friend_requests"
  as permissive
  for select
  to authenticated
using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));



  create policy "Service role can manage all friendships"
  on "public"."friends"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role full access"
  on "public"."friends"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Users can create friend requests"
  on "public"."friends"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete friendships"
  on "public"."friends"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = user_id) OR (auth.uid() = friend_id)));



  create policy "Users can delete their friendships"
  on "public"."friends"
  as permissive
  for delete
  to public
using (((auth.uid() = user_id) OR (auth.uid() = friend_id)));



  create policy "Users can update their friendships"
  on "public"."friends"
  as permissive
  for update
  to public
using (((auth.uid() = user_id) OR (auth.uid() = friend_id)));



  create policy "Users can view their friendships"
  on "public"."friends"
  as permissive
  for select
  to authenticated
using (((auth.uid() = user_id) OR (auth.uid() = friend_id)));



  create policy "Users can view their own friendships"
  on "public"."friends"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (auth.uid() = friend_id)));



  create policy "System can insert notifications"
  on "public"."notifications"
  as permissive
  for insert
  to public
with check (true);



  create policy "Users can delete their own notifications"
  on "public"."notifications"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Anyone can view QR codes"
  on "public"."qr_codes"
  as permissive
  for select
  to public
using (true);



  create policy "Users can create QR codes for their decks"
  on "public"."qr_codes"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.decks
  WHERE ((decks.id = qr_codes.deck_id) AND (decks.user_id = auth.uid()))))));



  create policy "Users can delete their own QR codes"
  on "public"."qr_codes"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Anyone can view ratings"
  on "public"."ratings"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can create ratings"
  on "public"."ratings"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own ratings"
  on "public"."ratings"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own ratings"
  on "public"."ratings"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Anyone can view replies"
  on "public"."replies"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can create replies"
  on "public"."replies"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Moderators can delete any reply"
  on "public"."replies"
  as permissive
  for delete
  to public
using (public.is_moderator_or_superuser());



  create policy "Moderators can update any reply"
  on "public"."replies"
  as permissive
  for update
  to public
using (public.is_moderator_or_superuser());



  create policy "Users can delete their own replies"
  on "public"."replies"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own replies"
  on "public"."replies"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can create their own study sessions"
  on "public"."study_sessions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own study sessions"
  on "public"."study_sessions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own study sessions"
  on "public"."study_sessions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Assigned moderators can update their tickets"
  on "public"."tickets"
  as permissive
  for update
  to public
using ((auth.uid() = assigned_to));



  create policy "Assigned users can view tickets"
  on "public"."tickets"
  as permissive
  for select
  to public
using ((auth.uid() = assigned_to));



  create policy "Moderators can create tickets"
  on "public"."tickets"
  as permissive
  for insert
  to public
with check (public.is_moderator_or_superuser());



  create policy "Moderators can update tickets"
  on "public"."tickets"
  as permissive
  for update
  to public
using (public.is_moderator_or_superuser());



  create policy "Moderators can view all tickets"
  on "public"."tickets"
  as permissive
  for select
  to public
using (public.is_moderator_or_superuser());



  create policy "Superusers can delete tickets"
  on "public"."tickets"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.is_superuser = true)))));



  create policy "Users can view their own tickets"
  on "public"."tickets"
  as permissive
  for select
  to public
using ((auth.uid() = created_by));



  create policy "System can insert user stats"
  on "public"."user_stats"
  as permissive
  for insert
  to public
with check (true);



  create policy "Users can update their own stats"
  on "public"."user_stats"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view friends' stats"
  on "public"."user_stats"
  as permissive
  for select
  to public
using (public.is_friends_with(user_id));



  create policy "Users can view their own stats"
  on "public"."user_stats"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own profile"
  on "public"."users"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view other users' public data"
  on "public"."users"
  as permissive
  for select
  to public
using (true);



  create policy "Users can view their own profile"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "users can update their own profile"
  on "public"."users"
  as permissive
  for update
  to public
using ((id = auth.uid()))
with check ((id = auth.uid()));


CREATE TRIGGER cards_card_count_trigger AFTER INSERT OR DELETE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_deck_card_count();

CREATE TRIGGER cards_delete_trigger AFTER DELETE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_deck_content_timestamp();

CREATE TRIGGER cards_insert_trigger AFTER INSERT ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_deck_content_timestamp();

CREATE TRIGGER cards_update_trigger AFTER UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_deck_content_timestamp();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER comments_count_trigger AFTER INSERT OR DELETE OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_community_deck_comment_count();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_card_count_on_delete AFTER DELETE ON public.community_cards FOR EACH ROW EXECUTE FUNCTION public.update_community_deck_card_count();

CREATE TRIGGER update_card_count_on_insert AFTER INSERT ON public.community_cards FOR EACH ROW EXECUTE FUNCTION public.update_community_deck_card_count();

CREATE TRIGGER increment_version_on_republish BEFORE INSERT OR UPDATE ON public.community_decks FOR EACH ROW EXECUTE FUNCTION public.increment_community_deck_version();

CREATE TRIGGER update_community_decks_updated_at BEFORE UPDATE ON public.community_decks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_decks_updated_at BEFORE UPDATE ON public.decks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flags_updated_at BEFORE UPDATE ON public.flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friends FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rating_aggregates AFTER INSERT OR DELETE OR UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_community_deck_rating();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_replies_updated_at BEFORE UPDATE ON public.replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER create_user_achievements_trigger AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_user_achievements();

CREATE TRIGGER create_user_stats_trigger AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_user_stats();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


