-- 008_admin_and_notifications
-- 1. Flag is_admin em profiles
-- 2. Tabela notifications (broadcast do admin) + notification_reads (status por user)
-- 3. RPCs: my_notifications, mark_notification_read, mark_all_read, unread_count, broadcast_notification
-- 4. Helper is_admin()

-- ===== 1. is_admin =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS profiles_admin_idx ON public.profiles (is_admin) WHERE is_admin = true;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND is_admin = true);
$$;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;

-- ===== 2. notifications (broadcast) =====
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'announcement',
  title text NOT NULL,
  body text NULL,
  link text NULL,                   -- url interna ex: /upgrade.html
  audience text NOT NULL DEFAULT 'all',  -- all | pro | free
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,

  CONSTRAINT notifications_type_check CHECK (type IN ('announcement','feature','bugfix','promo')),
  CONSTRAINT notifications_audience_check CHECK (audience IN ('all','pro','free'))
);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Todos os autenticados leem (vou filtrar audience via RPC)
DROP POLICY IF EXISTS notifications_auth_select ON public.notifications;
CREATE POLICY notifications_auth_select
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    (expires_at IS NULL OR expires_at > now())
  );

-- Admin pode insert/update/delete
DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;
CREATE POLICY notifications_admin_insert
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS notifications_admin_update ON public.notifications;
CREATE POLICY notifications_admin_update
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS notifications_admin_delete ON public.notifications;
CREATE POLICY notifications_admin_delete
  ON public.notifications FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ===== 3. notification_reads (status por user) =====
CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);
CREATE INDEX IF NOT EXISTS notification_reads_user_idx ON public.notification_reads (user_id);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_reads_self ON public.notification_reads;
CREATE POLICY notification_reads_self
  ON public.notification_reads FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ===== 4. RPCs =====

-- Filtra notifications por audience que se aplica ao user logado
CREATE OR REPLACE FUNCTION public.my_notifications(p_limit int DEFAULT 30)
RETURNS TABLE (
  id uuid, type text, title text, body text, link text,
  created_at timestamptz, is_read boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH u AS (
    SELECT auth.uid() AS uid,
           public.is_pro_user(auth.uid()) AS is_pro
  )
  SELECT n.id, n.type, n.title, n.body, n.link, n.created_at,
         (nr.user_id IS NOT NULL) AS is_read
    FROM public.notifications n
    CROSS JOIN u
    LEFT JOIN public.notification_reads nr
      ON nr.notification_id = n.id AND nr.user_id = u.uid
   WHERE (n.expires_at IS NULL OR n.expires_at > now())
     AND (
       n.audience = 'all'
       OR (n.audience = 'pro' AND u.is_pro)
       OR (n.audience = 'free' AND NOT u.is_pro)
     )
   ORDER BY n.created_at DESC
   LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.my_notifications(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.unread_notifications_count()
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH u AS (
    SELECT auth.uid() AS uid,
           public.is_pro_user(auth.uid()) AS is_pro
  )
  SELECT count(*)::int
    FROM public.notifications n
    CROSS JOIN u
    LEFT JOIN public.notification_reads nr
      ON nr.notification_id = n.id AND nr.user_id = u.uid
   WHERE nr.user_id IS NULL
     AND (n.expires_at IS NULL OR n.expires_at > now())
     AND (
       n.audience = 'all'
       OR (n.audience = 'pro' AND u.is_pro)
       OR (n.audience = 'free' AND NOT u.is_pro)
     );
$$;
GRANT EXECUTE ON FUNCTION public.unread_notifications_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.notification_reads (notification_id, user_id)
  VALUES (p_id, auth.uid())
  ON CONFLICT DO NOTHING;
$$;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.notification_reads (notification_id, user_id)
  SELECT n.id, auth.uid()
    FROM public.notifications n
    LEFT JOIN public.notification_reads nr
      ON nr.notification_id = n.id AND nr.user_id = auth.uid()
   WHERE nr.user_id IS NULL
     AND (n.expires_at IS NULL OR n.expires_at > now())
  ON CONFLICT DO NOTHING;
$$;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- Helper pro admin disparar (mais ergo que insert direto)
CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_title text, p_body text, p_link text DEFAULT NULL,
  p_type text DEFAULT 'announcement', p_audience text DEFAULT 'all'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin can broadcast';
  END IF;
  INSERT INTO public.notifications (type, title, body, link, audience, created_by)
  VALUES (p_type, p_title, p_body, p_link, p_audience, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.broadcast_notification(text, text, text, text, text) TO authenticated;
