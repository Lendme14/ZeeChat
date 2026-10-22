-- Allow the photo and video formats accepted by ZeeChat Stories.
-- Existing object policies remain unchanged; this only updates the bucket's upload limits.
update storage.buckets
set
  file_size_limit = 31457280,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/ogg'
  ]
where id = 'zeechat-media';
