-- 009_admin_full_control_and_view_fix
-- 1. Fix view: anonimo nao vinha pegando author_display_name/username porque
--    RLS de profiles bloqueia anon. Muda a view pra security_invoker = off
--    e filtra is_published manualmente no WHERE pra preservar gating.
-- 2. Admin (is_admin=true) pode UPDATE/DELETE qualquer prompt_post (curadoria).

-- ===== 1. View (sem security_invoker) =====
DROP VIEW IF EXISTS public.prompt_posts_public;
CREATE VIEW public.prompt_posts_public AS
SELECT
  pp.id, pp.title, pp.slug,
  CASE
    WHEN pp.is_pro AND NOT public.is_pro_user(auth.uid())
    THEN substring(pp.prompt_text from 1 for 80) || '…'
    ELSE pp.prompt_text
  END AS prompt_text,
  pp.cover_image_url, pp.model_used, pp.aspect_ratio, pp.language,
  pp.category, pp.tone, pp.extras, pp.tags, pp.author_id,
  pp.is_pro, pp.is_validated, pp.is_published,
  pp.likes_count, pp.copies_count, pp.views_count,
  pp.created_at, pp.updated_at,
  p.display_name AS author_display_name,
  p.username     AS author_username,
  p.avatar_url   AS author_avatar_url
FROM public.prompt_posts pp
LEFT JOIN public.profiles p ON p.id = pp.author_id
WHERE pp.is_published = true
   OR pp.author_id = auth.uid()
   OR public.is_admin(auth.uid());

GRANT SELECT ON public.prompt_posts_public TO anon, authenticated;

-- ===== 2. Admin full control em prompt_posts =====
-- Admin pode editar e excluir qualquer post (curadoria)
DROP POLICY IF EXISTS prompt_posts_admin_full ON public.prompt_posts;
CREATE POLICY prompt_posts_admin_full
  ON public.prompt_posts FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
