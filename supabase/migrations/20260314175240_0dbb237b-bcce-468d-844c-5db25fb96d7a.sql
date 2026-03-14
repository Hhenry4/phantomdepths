-- Store game progress snapshots keyed by Firebase UID
CREATE TABLE IF NOT EXISTS public.player_progress (
  firebase_uid TEXT PRIMARY KEY,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;

-- Policies: allow client writes/reads for game save payloads
DROP POLICY IF EXISTS "Read player progress" ON public.player_progress;
DROP POLICY IF EXISTS "Insert player progress" ON public.player_progress;
DROP POLICY IF EXISTS "Update player progress" ON public.player_progress;

CREATE POLICY "Read player progress"
ON public.player_progress
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Insert player progress"
ON public.player_progress
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Update player progress"
ON public.player_progress
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_player_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_player_progress_updated_at ON public.player_progress;

CREATE TRIGGER trg_player_progress_updated_at
BEFORE UPDATE ON public.player_progress
FOR EACH ROW
EXECUTE FUNCTION public.set_player_progress_updated_at();

CREATE INDEX IF NOT EXISTS idx_player_progress_updated_at ON public.player_progress(updated_at DESC);