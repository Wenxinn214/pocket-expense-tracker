export const MAX_PHOTOS = 4;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 1600;

// Decode and re-encode locally: small photos, correct orientation, no EXIF metadata.
export async function preparePhoto(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') throw new Error('Choose a photo in JPG, PNG, WebP or another supported image format.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Choose a photo smaller than 20 MB.');
  let bitmap;
  try { bitmap = await createImageBitmap(file, {imageOrientation:'from-image'}); }
  catch { throw new Error('This photo could not be opened. Try a JPG, PNG or WebP image.'); }
  try {
    if (!bitmap.width || !bitmap.height) throw new Error('This photo has no image content.');
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (!blob) throw new Error('This photo could not be prepared. Please try another image.');
    return {id:crypto.randomUUID(), name:file.name, blob, width:canvas.width, height:canvas.height, createdAt:new Date().toISOString()};
  } finally { bitmap.close(); }
}
