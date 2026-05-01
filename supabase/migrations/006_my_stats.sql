-- 006_my_stats
-- RPC pra estatisticas pessoais do usuario logado.

CREATE OR REPLACE FUNCTION public.my_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'published', (
      SELECT count(*) FROM public.prompt_posts
      WHERE author_id = auth.uid() AND is_published
    ),
    'drafts', (
      SELECT count(*) FROM public.prompt_posts
      WHERE author_id = auth.uid() AND NOT is_published
    ),
    'likes_received', COALESCE((
      SELECT sum(likes_count) FROM public.prompt_posts
      WHERE author_id = auth.uid()
    ), 0),
    'copies_received', COALESCE((
      SELECT sum(copies_count) FROM public.prompt_posts
      WHERE author_id = auth.uid()
    ), 0),
    'favorites_count', (
      SELECT count(*) FROM public.prompt_favorites
      WHERE user_id = auth.uid()
    ),
    'validated_count', (
      SELECT count(*) FROM public.prompt_validations
      WHERE user_id = auth.uid()
    ),
    'top_copied', (
      SELECT jsonb_build_object(
        'slug', slug, 'title', title,
        'copies_count', copies_count, 'cover', cover_image_url
      )
      FROM public.prompt_posts
      WHERE author_id = auth.uid() AND is_published AND copies_count > 0
      ORDER BY copies_count DESC, created_at DESC
      LIMIT 1
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.my_stats() TO authenticated;
