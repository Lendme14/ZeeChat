-- Enable private voice-note uploads in the existing direct-message media bucket.
-- Existing photo/video types remain allowed.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/mpeg',
  'audio/wav',
  'audio/aac'
]
where id = 'zeechat-chat-media';
