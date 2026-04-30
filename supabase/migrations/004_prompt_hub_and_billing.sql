-- 004_prompt_hub_and_billing
-- Fase 1 do Prompt Hub + Sistema Pro.
-- Aditiva e idempotente. Nao toca em profiles/prompts/prompt_images existentes
-- alem de adicionar colunas novas em profiles.

-- =========================================================================
-- 1. PROFILES: extender com colunas novas
-- =========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS pro_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS bio text NULL,
  ADD COLUMN IF NOT EXISTS username text NULL,
  ADD COLUMN IF NOT EXISTS asaas_customer_id text NULL,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text NULL;

-- check de plano
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_check
      CHECK (plan IN ('free','pro','studio'));
  END IF;
END$$;

-- username unico (permite NULL multiplo via index parcial)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- =========================================================================
-- 2. PROMPT_POSTS: galeria publica de prompts
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.prompt_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  prompt_text text NOT NULL,
  cover_image_url text NULL,
  model_used text NULL,
  aspect_ratio text NULL,
  language text NOT NULL DEFAULT 'pt',
  category text NULL,
  tone text NULL,
  extras text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pro boolean NOT NULL DEFAULT false,
  is_validated boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  likes_count integer NOT NULL DEFAULT 0,
  copies_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT prompt_posts_model_used_check
    CHECK (model_used IS NULL OR model_used IN
      ('gemini','midjourney','whisk','dalle','stable-diffusion','flux','outro')),
  CONSTRAINT prompt_posts_aspect_ratio_check
    CHECK (aspect_ratio IS NULL OR aspect_ratio IN
      ('1:1','16:9','9:16','3:4','4:5','4:3')),
  CONSTRAINT prompt_posts_language_check
    CHECK (language IN ('pt','en','es','fr','ar')),
  CONSTRAINT prompt_posts_tone_check
    CHECK (tone IS NULL OR tone IN ('vibrante','escuro-atmosferico','elegante')),
  CONSTRAINT prompt_posts_category_check
    CHECK (category IS NULL OR category IN (
      'realista','cinematografico','anime','arquitetura','cartoon','3d','vetor',
      'aquarela','esboco','pintura-oleo','abstrato','surreal','moda','fotografia',
      'retrato','corporativo','minimalista','moderno','produto','logo','infografico',
      'fantasia','ficcao-cientifica','cyberpunk','retro-vintage','grunge'
    ))
);

CREATE INDEX IF NOT EXISTS prompt_posts_published_created_idx
  ON public.prompt_posts (is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS prompt_posts_category_idx
  ON public.prompt_posts (category);
CREATE INDEX IF NOT EXISTS prompt_posts_model_used_idx
  ON public.prompt_posts (model_used);
CREATE INDEX IF NOT EXISTS prompt_posts_author_id_idx
  ON public.prompt_posts (author_id);
CREATE INDEX IF NOT EXISTS prompt_posts_tags_gin_idx
  ON public.prompt_posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS prompt_posts_extras_gin_idx
  ON public.prompt_posts USING GIN (extras);

ALTER TABLE public.prompt_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prompt_posts_anon_select ON public.prompt_posts;
CREATE POLICY prompt_posts_anon_select
  ON public.prompt_posts FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS prompt_posts_owner_full ON public.prompt_posts;
CREATE POLICY prompt_posts_owner_full
  ON public.prompt_posts FOR ALL
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- =========================================================================
-- 3. PROMPT_LIKES, PROMPT_FAVORITES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.prompt_likes (
  prompt_id uuid NOT NULL REFERENCES public.prompt_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prompt_id, user_id)
);
CREATE INDEX IF NOT EXISTS prompt_likes_user_idx
  ON public.prompt_likes (user_id);

ALTER TABLE public.prompt_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prompt_likes_anon_select ON public.prompt_likes;
CREATE POLICY prompt_likes_anon_select
  ON public.prompt_likes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS prompt_likes_self_insert ON public.prompt_likes;
CREATE POLICY prompt_likes_self_insert
  ON public.prompt_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS prompt_likes_self_delete ON public.prompt_likes;
CREATE POLICY prompt_likes_self_delete
  ON public.prompt_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.prompt_favorites (
  prompt_id uuid NOT NULL REFERENCES public.prompt_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prompt_id, user_id)
);
CREATE INDEX IF NOT EXISTS prompt_favorites_user_idx
  ON public.prompt_favorites (user_id);

ALTER TABLE public.prompt_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prompt_favorites_self_select ON public.prompt_favorites;
CREATE POLICY prompt_favorites_self_select
  ON public.prompt_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS prompt_favorites_self_insert ON public.prompt_favorites;
CREATE POLICY prompt_favorites_self_insert
  ON public.prompt_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS prompt_favorites_self_delete ON public.prompt_favorites;
CREATE POLICY prompt_favorites_self_delete
  ON public.prompt_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- 4. PROMPT_COPIES (telemetria)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.prompt_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES public.prompt_posts(id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prompt_copies_prompt_idx
  ON public.prompt_copies (prompt_id, created_at DESC);

ALTER TABLE public.prompt_copies ENABLE ROW LEVEL SECURITY;

-- Insert publico (visitante anonimo pode copiar)
DROP POLICY IF EXISTS prompt_copies_public_insert ON public.prompt_copies;
CREATE POLICY prompt_copies_public_insert
  ON public.prompt_copies FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- usuario anonimo so insere com user_id NULL
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Sem policy de SELECT = ninguem le. Service role ignora RLS.

-- =========================================================================
-- 5. PROMPT_VALIDATIONS (testado por X)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.prompt_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES public.prompt_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result_image_url text NULL,
  comment text NULL,
  worked_well boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prompt_validations_prompt_idx
  ON public.prompt_validations (prompt_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS prompt_validations_unique_per_user
  ON public.prompt_validations (prompt_id, user_id);

ALTER TABLE public.prompt_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prompt_validations_anon_select ON public.prompt_validations;
CREATE POLICY prompt_validations_anon_select
  ON public.prompt_validations FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS prompt_validations_self_insert ON public.prompt_validations;
CREATE POLICY prompt_validations_self_insert
  ON public.prompt_validations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS prompt_validations_self_update ON public.prompt_validations;
CREATE POLICY prompt_validations_self_update
  ON public.prompt_validations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS prompt_validations_self_delete ON public.prompt_validations;
CREATE POLICY prompt_validations_self_delete
  ON public.prompt_validations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- 6. CHAT_SESSIONS (historico do Chat IA)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_sessions_user_idx
  ON public.chat_sessions (user_id, updated_at DESC);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_sessions_self_full ON public.chat_sessions;
CREATE POLICY chat_sessions_self_full
  ON public.chat_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- 7. SUBSCRIPTIONS (espelho local Asaas)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_subscription_id text NOT NULL UNIQUE,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  cycle text NOT NULL DEFAULT 'MONTHLY',
  value numeric(10,2) NOT NULL,
  next_due_date date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_plan_check CHECK (plan IN ('pro','studio')),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('pending','active','overdue','canceled','expired'))
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx
  ON public.subscriptions (user_id, status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Dono LE so as proprias. Insert/Update via service role (Edge Function).
DROP POLICY IF EXISTS subscriptions_self_select ON public.subscriptions;
CREATE POLICY subscriptions_self_select
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- 8. PAYMENT_EVENTS (log de webhooks Asaas)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_events_type_idx
  ON public.payment_events (event_type, processed_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
-- Sem policy = service role only.

-- =========================================================================
-- 9. STUDIO_WAITLIST
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.studio_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_waitlist ENABLE ROW LEVEL SECURITY;

-- Insert publico (qualquer um pode entrar na waitlist)
DROP POLICY IF EXISTS studio_waitlist_public_insert ON public.studio_waitlist;
CREATE POLICY studio_waitlist_public_insert
  ON public.studio_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Sem policy de SELECT = ninguem le. Admin via service role.

-- =========================================================================
-- 10. HELPERS / RPCs
-- =========================================================================

-- is_pro_user: e a fonte de verdade pra gating Pro
CREATE OR REPLACE FUNCTION public.is_pro_user(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid
      AND plan IN ('pro','studio')
      AND pro_until IS NOT NULL
      AND pro_until > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_pro_user(uuid) TO anon, authenticated;

-- get_prompt_text: gateia Pro server-side
CREATE OR REPLACE FUNCTION public.get_prompt_text(p_slug text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_text text;
  v_is_pro boolean;
  v_published boolean;
BEGIN
  SELECT prompt_text, is_pro, is_published
    INTO v_text, v_is_pro, v_published
    FROM public.prompt_posts
    WHERE slug = p_slug
    LIMIT 1;

  IF NOT FOUND OR NOT v_published THEN
    RETURN NULL;
  END IF;

  IF v_is_pro AND NOT public.is_pro_user(auth.uid()) THEN
    RETURN NULL;
  END IF;

  RETURN v_text;
END;
$$;

REVOKE ALL ON FUNCTION public.get_prompt_text(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_prompt_text(text) TO anon, authenticated;

-- =========================================================================
-- 11. TRIGGERS
-- =========================================================================

-- updated_at generico
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prompt_posts_set_updated_at ON public.prompt_posts;
CREATE TRIGGER prompt_posts_set_updated_at
  BEFORE UPDATE ON public.prompt_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS chat_sessions_set_updated_at ON public.chat_sessions;
CREATE TRIGGER chat_sessions_set_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- counters
CREATE OR REPLACE FUNCTION public.tg_likes_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.prompt_posts
       SET likes_count = likes_count + 1
     WHERE id = NEW.prompt_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.prompt_posts
       SET likes_count = GREATEST(0, likes_count - 1)
     WHERE id = OLD.prompt_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prompt_likes_count ON public.prompt_likes;
CREATE TRIGGER prompt_likes_count
  AFTER INSERT OR DELETE ON public.prompt_likes
  FOR EACH ROW EXECUTE FUNCTION public.tg_likes_count();

CREATE OR REPLACE FUNCTION public.tg_copies_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.prompt_posts
     SET copies_count = copies_count + 1
   WHERE id = NEW.prompt_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prompt_copies_count ON public.prompt_copies;
CREATE TRIGGER prompt_copies_count
  AFTER INSERT ON public.prompt_copies
  FOR EACH ROW EXECUTE FUNCTION public.tg_copies_count();
