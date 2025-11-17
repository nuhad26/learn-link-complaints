-- Create storage bucket for complaint attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-attachments', 'complaint-attachments', false);

-- Add attachment_url column to complaints table
ALTER TABLE public.complaints
ADD COLUMN attachment_url text;

-- Create RLS policies for complaint attachments storage
CREATE POLICY "Students can upload their own complaint attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaint-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view attachments for their complaints"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-attachments' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    is_admin(auth.uid())
  )
);

CREATE POLICY "Students can delete their own complaint attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'complaint-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);