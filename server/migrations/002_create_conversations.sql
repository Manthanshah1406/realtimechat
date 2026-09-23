DO $$ BEGIN
  CREATE TYPE conversation_type AS ENUM ('direct', 'group');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  type       conversation_type NOT NULL,
  name       VARCHAR(100),                          -- null for direct chats
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL DEFAULT 'member',            -- member | admin
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON conversation_members(conversation_id);
