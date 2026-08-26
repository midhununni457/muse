const path = require('path');
const crypto = require('crypto');
const supabase = require('./supabase');

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'songs';

/**
 * Uploads an audio buffer to Supabase Storage.
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{ publicUrl: string, storagePath: string }>}
 */
async function uploadAudioToSupabase(buffer, originalName, mimeType = 'audio/mpeg') {
  const ext = path.extname(originalName) || '.mp3';
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const storagePath = `${uniqueName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload audio to Supabase Storage: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return {
    publicUrl: publicUrlData.publicUrl,
    storagePath: storagePath,
  };
}

/**
 * Deletes an audio file from Supabase Storage.
 * @param {string} filePathOrUrl - Public URL or relative path inside bucket
 */
async function deleteAudioFromSupabase(filePathOrUrl) {
  if (!filePathOrUrl) return;

  let storagePath = filePathOrUrl;
  if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
    const parts = filePathOrUrl.split(`/${BUCKET_NAME}/`);
    if (parts.length > 1) {
      storagePath = parts[1];
    } else {
      storagePath = path.basename(filePathOrUrl);
    }
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.warn(`Failed to delete file '${storagePath}' from Supabase Storage:`, error.message);
  }
}

/**
 * Downloads/fetches audio buffer from Supabase Storage or public URL.
 * @param {string} filePathOrUrl - Public URL or relative path
 * @returns {Promise<Buffer>}
 */
async function getAudioBufferFromSupabase(filePathOrUrl) {
  if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
    const res = await fetch(filePathOrUrl);
    if (!res.ok) {
      throw new Error(`Failed to download audio from URL: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(filePathOrUrl);

  if (error) {
    throw new Error(`Failed to download audio from Supabase Storage: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = {
  uploadAudioToSupabase,
  deleteAudioFromSupabase,
  getAudioBufferFromSupabase,
  BUCKET_NAME,
};
