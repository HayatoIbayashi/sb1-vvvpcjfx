CREATE TABLE IF NOT EXISTS watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT watch_history_user_id_movie_id_key UNIQUE (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_watched_at
  ON watch_history (user_id, watched_at DESC);

DROP TRIGGER IF EXISTS trg_watch_history_updated ON watch_history;
CREATE TRIGGER trg_watch_history_updated
BEFORE UPDATE ON watch_history
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
