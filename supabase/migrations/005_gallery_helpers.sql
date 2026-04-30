-- 005_gallery_helpers
-- View com autor + RPCs de stats e tracking pra galeria

-- View: prompt_posts + dados do autor (security_invoker propaga RLS)
DROP VIEW IF EXISTS public.prompt_posts_public;
CREATE VIEW public.prompt_posts_public
WITH (security_invoker = on) AS
SELECT
  pp.id,
  pp.title,
  pp.slug,
  pp.prompt_text,
  pp.cover_image_url,
  pp.model_used,
  pp.aspect_ratio,
  pp.language,
  pp.category,
  pp.tone,
  pp.extras,
  pp.tags,
  pp.author_id,
  pp.is_pro,
  pp.is_validated,
  pp.is_published,
  pp.likes_count,
  pp.copies_count,
  pp.views_count,
  pp.created_at,
  pp.updated_at,
  p.display_name AS author_display_name,
  p.username     AS author_username,
  p.avatar_url   AS author_avatar_url
FROM public.prompt_posts pp
LEFT JOIN public.profiles p ON p.id = pp.author_id;

GRANT SELECT ON public.prompt_posts_public TO anon, authenticated;

-- Stats da galeria (publica)
CREATE OR REPLACE FUNCTION public.gallery_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'total_prompts',  (SELECT count(*) FROM public.prompt_posts WHERE is_published),
    'total_creators', (SELECT count(DISTINCT author_id) FROM public.prompt_posts WHERE is_published),
    'total_copies',   (SELECT count(*) FROM public.prompt_copies)
  );
$$;
GRANT EXECUTE ON FUNCTION public.gallery_stats() TO anon, authenticated;

-- Track view (incrementa contador, debounce no client)
CREATE OR REPLACE FUNCTION public.track_view(p_slug text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.prompt_posts
     SET views_count = views_count + 1
   WHERE slug = p_slug AND is_published;
$$;
GRANT EXECUTE ON FUNCTION public.track_view(text) TO anon, authenticated;
