CREATE TABLE photo_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES ride_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photo_id, user_id)
);
ALTER TABLE photo_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_reactions_select" ON photo_reactions FOR SELECT USING (true);
CREATE POLICY "photo_reactions_insert" ON photo_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photo_reactions_update" ON photo_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "photo_reactions_delete" ON photo_reactions FOR DELETE USING (auth.uid() = user_id);
