/**
 * Converts various Google Drive shareable URLs into direct image URLs.
 * Examples supported:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 */
export function convertGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return url;

  const trimmed = url.trim();

  // Check if it's a Google Drive URL
  if (!trimmed.includes('drive.google.com') && !trimmed.includes('docs.google.com')) {
    return trimmed;
  }

  let fileId = null;

  // Pattern 1: /file/d/FILE_ID/
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    fileId = fileDMatch[1];
  }

  // Pattern 2: ?id=FILE_ID or &id=FILE_ID
  if (!fileId) {
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      fileId = idMatch[1];
    }
  }

  if (fileId) {
    // High-resolution direct thumbnail link from Google CDN (lh3.googleusercontent.com/d/FILE_ID)
    return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
  }

  return trimmed;
}

export function isGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}
