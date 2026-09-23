CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  content         TEXT,
  attachment_url  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT message_has_content CHECK (content IS NOT NULL OR attachment_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender      ON messages(sender_id);
