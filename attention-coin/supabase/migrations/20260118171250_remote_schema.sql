


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."generate_referral_code"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
  DECLARE
      chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      code VARCHAR(12) := '';
      i INTEGER;
  BEGIN
      FOR i IN 1..8 LOOP
          code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      RETURN code;
  END;
  $$;


ALTER FUNCTION "public"."generate_referral_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_user_earnings"("p_user_id" "uuid", "p_amount" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    UPDATE users
    SET total_earned_lamports = COALESCE(total_earned_lamports, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
  END;
  $$;


ALTER FUNCTION "public"."increment_user_earnings"("p_user_id" "uuid", "p_amount" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_user_submissions"("user_wallet" character varying) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
      UPDATE users SET total_submissions = total_submissions + 1
      WHERE wallet_address = user_wallet;
  END;
  $$;


ALTER FUNCTION "public"."increment_user_submissions"("user_wallet" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_referral_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
      IF NEW.referral_code IS NULL THEN
          NEW.referral_code := generate_referral_code();
      END IF;
      RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."set_referral_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_streak"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
      last_date DATE;
      today DATE := CURRENT_DATE;
  BEGIN
      SELECT last_submission_date INTO last_date FROM users WHERE id = p_user_id;

      IF last_date IS NULL OR last_date < today - 1 THEN
          -- Reset streak
          UPDATE users SET
              current_streak = 1,
              last_submission_date = today
          WHERE id = p_user_id;
      ELSIF last_date = today - 1 THEN
          -- Continue streak
          UPDATE users SET
              current_streak = current_streak + 1,
              longest_streak = GREATEST(longest_streak, current_streak + 1),
              last_submission_date = today
          WHERE id = p_user_id;
      END IF;
      -- If last_date = today, don't update (already submitted today)
  END;
  $$;


ALTER FUNCTION "public"."update_user_streak"("p_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "description" "text",
    "icon" character varying(50) NOT NULL,
    "requirement_type" character varying(50) NOT NULL,
    "requirement_value" integer NOT NULL,
    "color" character varying(20) DEFAULT 'primary'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."config" (
    "key" character varying(100) NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "amount_lamports" bigint NOT NULL,
    "payout_type" character varying(20) DEFAULT 'submission'::character varying,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "tx_signature" character varying(88),
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "submission_ids" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "batch_id" character varying(36),
    "retry_count" integer DEFAULT 0,
    "last_error" "text"
);


ALTER TABLE "public"."payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "period_date" "date" NOT NULL,
    "total_score" numeric(10,2) DEFAULT 0,
    "amount_lamports" bigint DEFAULT 0,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "tx_signature" character varying(88),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "tweet_id" character varying(32) NOT NULL,
    "tweet_url" "text" NOT NULL,
    "tweet_text" "text",
    "has_ca" boolean DEFAULT false,
    "has_cashtag" boolean DEFAULT false,
    "has_media" boolean DEFAULT false,
    "posted_at" timestamp with time zone,
    "likes" integer DEFAULT 0,
    "reposts" integer DEFAULT 0,
    "replies" integer DEFAULT 0,
    "quotes" integer DEFAULT 0,
    "views" integer DEFAULT 0,
    "base_score" numeric(10,2) DEFAULT 0,
    "trust_multiplier" numeric(4,3) DEFAULT 1.000,
    "quality_multiplier" numeric(4,3) DEFAULT 1.000,
    "final_score" numeric(10,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "rejection_reason" "text",
    "verified_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "content_hash" character varying(64),
    "flagged" boolean DEFAULT false,
    "flag_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "badge_id" "uuid",
    "earned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "wallet_address" character varying(44) NOT NULL,
    "x_username" character varying(50),
    "x_user_id" character varying(32),
    "x_display_name" character varying(100),
    "x_followers" integer DEFAULT 0,
    "x_following" integer DEFAULT 0,
    "x_profile_image" "text",
    "x_verified_at" timestamp with time zone,
    "verification_code" character varying(16),
    "verification_expires" timestamp with time zone,
    "trust_score" numeric(4,3) DEFAULT 0.500,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "blacklist_reason" "text",
    "total_earned_lamports" bigint DEFAULT 0,
    "total_submissions" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_submission_date" "date",
    "referral_code" character varying(12),
    "referred_by" "uuid",
    "referral_earnings_lamports" bigint DEFAULT 0,
    "total_referrals" integer DEFAULT 0
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."config"
    ADD CONSTRAINT "config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_user_id_period_date_key" UNIQUE ("user_id", "period_date");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_tweet_id_key" UNIQUE ("tweet_id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_wallet_address_key" UNIQUE ("wallet_address");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_x_username_key" UNIQUE ("x_username");



CREATE INDEX "idx_payouts_batch" ON "public"."payouts" USING "btree" ("batch_id");



CREATE INDEX "idx_payouts_retry" ON "public"."payouts" USING "btree" ("status", "retry_count") WHERE (("status")::"text" = 'failed'::"text");



CREATE INDEX "idx_payouts_status" ON "public"."payouts" USING "btree" ("status");



CREATE INDEX "idx_payouts_user" ON "public"."payouts" USING "btree" ("user_id");



CREATE INDEX "idx_rewards_user" ON "public"."rewards" USING "btree" ("user_id");



CREATE INDEX "idx_submissions_created" ON "public"."submissions" USING "btree" ("created_at");



CREATE INDEX "idx_submissions_status" ON "public"."submissions" USING "btree" ("status");



CREATE INDEX "idx_submissions_user" ON "public"."submissions" USING "btree" ("user_id");



CREATE INDEX "idx_user_badges_user" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_users_referral_code" ON "public"."users" USING "btree" ("referral_code");



CREATE INDEX "idx_users_referred_by" ON "public"."users" USING "btree" ("referred_by");



CREATE INDEX "idx_users_wallet" ON "public"."users" USING "btree" ("wallet_address");



CREATE INDEX "idx_users_x_username" ON "public"."users" USING "btree" ("x_username");



CREATE OR REPLACE TRIGGER "trigger_set_referral_code" BEFORE INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_referral_code"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("id");



CREATE POLICY "Allow insert payouts" ON "public"."payouts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert submissions" ON "public"."submissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read access to payouts" ON "public"."payouts" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to submissions" ON "public"."submissions" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow update payouts" ON "public"."payouts" FOR UPDATE USING (true);



CREATE POLICY "Allow update submissions" ON "public"."submissions" FOR UPDATE USING (true);



CREATE POLICY "Allow users to insert their own record" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow users to update their own record" ON "public"."users" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Config is viewable by everyone" ON "public"."config" FOR SELECT USING (true);



CREATE POLICY "Rewards are viewable by everyone" ON "public"."rewards" FOR SELECT USING (true);



CREATE POLICY "Rewards can be created" ON "public"."rewards" FOR INSERT WITH CHECK (true);



CREATE POLICY "Rewards can be updated" ON "public"."rewards" FOR UPDATE USING (true);



ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "badges_select_public" ON "public"."badges" FOR SELECT USING (true);



ALTER TABLE "public"."config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payouts_select_public" ON "public"."payouts" FOR SELECT USING (true);



ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "submissions_select_public" ON "public"."submissions" FOR SELECT USING (true);



ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_badges_select_public" ON "public"."user_badges" FOR SELECT USING (true);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_public" ON "public"."users" FOR SELECT USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_earnings"("p_user_id" "uuid", "p_amount" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_earnings"("p_user_id" "uuid", "p_amount" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_earnings"("p_user_id" "uuid", "p_amount" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_submissions"("user_wallet" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_submissions"("user_wallet" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_submissions"("user_wallet" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_referral_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_referral_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_referral_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak"("p_user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."config" TO "anon";
GRANT ALL ON TABLE "public"."config" TO "authenticated";
GRANT ALL ON TABLE "public"."config" TO "service_role";



GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


