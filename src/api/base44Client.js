import { supabase } from '@/lib/supabase';
import { entities } from '@/api/supabaseEntities';

const DEFAULT_STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'documents';

const sanitizeFileName = (fileName) =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

const uploadFile = async ({ file, bucket = DEFAULT_STORAGE_BUCKET, folder = 'uploads' }) => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const filePath = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Document upload failed. Ensure the "${bucket}" storage bucket exists and has upload policies for authenticated users. ${uploadError.message}`
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    bucket,
    file_path: filePath,
    file_url: data.publicUrl,
  };
};

// Drop-in replacement for base44 — all pages work without changes
export const base44 = {
  entities,
  integrations: {
    Core: {
      UploadFile: uploadFile,
    },
  },
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    logout: () => supabase.auth.signOut(),
    redirectToLogin: () => { window.location.href = '/login'; }
  }
};
