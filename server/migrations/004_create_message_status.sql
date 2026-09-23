DO $$ BEGIN
  CREATE TYPE message_status_enum AS ENUM ('delivered', 'seen');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS message_status (
  id         UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID                NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID                NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  status     message_status_enum NOT NULL,
  updated_at TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_status_message ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_msg_status_user    ON message_status(user_id);
