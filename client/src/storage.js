const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

function encodeStoragePath(value) {
  return String(value).split('/').map(encodeURIComponent).join('/');
}

export async function uploadSignedImage(upload, file) {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    throw new Error('Image storage is not set up for this website.');
  }

  const endpoint = `${SUPABASE_URL}/storage/v1/object/upload/sign/${encodeURIComponent(upload.bucket)}/${encodeStoragePath(upload.path)}?token=${encodeURIComponent(upload.token)}`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        apikey: PUBLISHABLE_KEY,
        'Content-Type': file.type,
      },
      body: file,
    });
  } catch {
    throw new Error('Image storage could not be reached. Check the storage URL and try again.');
  }

  if (!response.ok) throw new Error('The image could not be uploaded. Try again.');
}
