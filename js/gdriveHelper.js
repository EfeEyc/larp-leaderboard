export function convertGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  const trimmed = url.trim();

  if (trimmed.includes('lh3.googleusercontent.com') || trimmed.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) {
    return trimmed;
  }

  let fileId = null;

  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    fileId = matchFileD[1];
  }

  if (!fileId) {
    const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchIdParam && matchIdParam[1]) {
      fileId = matchIdParam[1];
    }
  }

  if (!fileId) {
    const matchUc = trimmed.match(/\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
    if (matchUc && matchUc[1]) {
      fileId = matchUc[1];
    }
  }

  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
  }

  return trimmed;
}

export function formatFileNameToTitle(fileName) {
  if (!fileName || typeof fileName !== 'string') return 'Untitled LARPer';
  let clean = fileName.replace(/\s*-\s*Google Drive/i, '');
  clean = clean.replace(/\.[^/.]+$/, "");
  clean = clean.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  return clean || 'Untitled LARPer';
}

// Instant regex extraction of file IDs (0ms delay)
export function parseGoogleDriveFileIds(text) {
  if (!text) return [];

  const folderMatch = text.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  const folderId = folderMatch ? folderMatch[1] : null;

  const fileIdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)|[?&]id=([a-zA-Z0-9_-]+)/g;
  const ids = new Set();
  let match;
  while ((match = fileIdRegex.exec(text)) !== null) {
    const id = match[1] || match[2];
    if (id && id.length > 10 && id !== folderId) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}
