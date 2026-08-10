INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'images');

CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
