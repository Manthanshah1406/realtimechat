-- Allow sender_id to be NULL for system/event messages
ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;

-- Add message type: 'text' (default) or 'system'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'text';

-- Relax the content constraint to allow system messages with no attachment
ALTER TABLE messages DROP CONSTRAINT IF EXISTS message_has_content;
ALTER TABLE messages ADD CONSTRAINT message_has_content
  CHECK (
    type = 'system'
    OR content IS NOT NULL
    OR attachment_url IS NOT NULL
  );
