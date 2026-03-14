-- Tighten access: remove permissive direct table policies
DROP POLICY IF EXISTS "Read player progress" ON public.player_progress;
DROP POLICY IF EXISTS "Insert player progress" ON public.player_progress;
DROP POLICY IF EXISTS "Update player progress" ON public.player_progress;

-- Optional explicit deny for direct reads from client roles
DROP POLICY IF EXISTS "No direct select" ON public.player_progress;
CREATE POLICY "No direct select"
ON public.player_progress
FOR SELECT
TO anon, authenticated
USING (false);

-- Security definer RPC to upsert progress safely
CREATE OR REPLACE FUNCTION public.save_player_progress(
  p_firebase_uid TEXT,
  p_progress JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_firebase_uid IS NULL OR p_firebase_uid !~ '^[A-Za-z0-9:_-]{6,128}$' THEN
    RAISE EXCEPTION 'Invalid firebase uid';
  END IF;

  INSERT INTO public.player_progress (firebase_uid, progress)
  VALUES (p_firebase_uid, COALESCE(p_progress, '{}'::jsonb))
  ON CONFLICT (firebase_uid)
  DO UPDATE SET
    progress = EXCLUDED.progress,
    updated_at = now();
END;
$$;

-- Security definer RPC to read progress safely
CREATE OR REPLACE FUNCTION public.load_player_progress(
  p_firebase_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress JSONB;
BEGIN
  IF p_firebase_uid IS NULL OR p_firebase_uid !~ '^[A-Za-z0-9:_-]{6,128}$' THEN
    RETURN NULL;
  END IF;

  SELECT progress
  INTO v_progress
  FROM public.player_progress
  WHERE firebase_uid = p_firebase_uid;

  RETURN v_progress;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_player_progress(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_player_progress(TEXT) TO anon, authenticated;