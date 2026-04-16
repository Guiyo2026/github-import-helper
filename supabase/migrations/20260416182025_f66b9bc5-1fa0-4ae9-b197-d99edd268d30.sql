INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shared-exercises',
  'shared-exercises',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can view shared exercise images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public can view shared exercise images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'shared-exercises')
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Service role can manage shared exercise images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Service role can manage shared exercise images"
      ON storage.objects FOR ALL
      USING (bucket_id = 'shared-exercises')
      WITH CHECK (bucket_id = 'shared-exercises')
    $policy$;
  END IF;
END
$$;