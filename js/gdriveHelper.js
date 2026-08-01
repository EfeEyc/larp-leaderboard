// Helper to convert Google Drive share URLs into direct embeddable img URLs
export function convertGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  const trimmed = url.trim();

  // Already converted lh3 URL or standard web image URL
  if (trimmed.includes('lh3.googleusercontent.com') || trimmed.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) {
    return trimmed;
  }

  let fileId = null;

  // Pattern 1: /file/d/FILE_ID/
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    fileId = matchFileD[1];
  }

  // Pattern 2: id=FILE_ID
  if (!fileId) {
    const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchIdParam && matchIdParam[1]) {
      fileId = matchIdParam[1];
    }
  }

  // Pattern 3: open?id=FILE_ID or uc?id=FILE_ID
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

// Clean filename to human title: "Sir_Cedric_Oakhaven.jpg" -> "Sir Cedric Oakhaven"
export function formatFileNameToTitle(fileName) {
  if (!fileName || typeof fileName !== 'string') return 'Untitled LARPer';
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  const cleanTitle = nameWithoutExt.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  return cleanTitle || 'Untitled LARPer';
}

// Extract multiple Google Drive file IDs from pasted text (links, folder views, export lists)
export function parseGoogleDriveFileIds(text) {
  if (!text) return [];
  const fileIdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)|[?&]id=([a-zA-Z0-9_-]+)/g;
  const ids = new Set();
  let match;
  while ((match = fileIdRegex.exec(text)) !== null) {
    const id = match[1] || match[2];
    if (id && id.length > 10) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}
