-- 007_fix_pro_text_leak
-- Vazamento de seguranca: a view prompt_posts_public retornava prompt_text
-- completo mesmo pra prompts Pro, expondo o conteudo gateado pra qualquer anon.
-- Fix: trunca prompt_text quando is_pro=true e user nao tem plano Pro.
-- Pro logado ve completo. Pro nao-assinante / anon ve so 80 chars + reticencias.

DROP VIEW IF EXISTS public.prompt_posts_public;
CREATE VIEW public.prompt_posts_public
WITH (security_invoker = on) AS
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
LEFT JOIN public.profiles p ON p.id = pp.author_id;

GRANT SELECT ON public.prompt_posts_public TO anon, authenticated;
