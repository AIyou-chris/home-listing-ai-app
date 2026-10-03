import { supabase } from '../services/supabase';

// Shrinks a photo to a small JPEG data URL (used only if storage is unavailable),
// so a headshot never turns into a multi-megabyte string inside every API response and email.
const shrinkToDataUrl = (file: File, maxSide = 320): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to read image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Image not supported.')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });

// Uploads to the public avatars bucket and returns a normal https URL.
// Falls back to a small data URL so the signup flow never dead-ends.
export const uploadHeadshot = async (file: File): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('unauthenticated');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `lo-headshots/${user.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
    throw new Error('no_public_url');
  } catch {
    return shrinkToDataUrl(file);
  }
};
