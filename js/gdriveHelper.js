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
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  const cleanTitle = nameWithoutExt.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  return cleanTitle || 'Untitled LARPer';
}

// Parse ONLY valid file IDs, strictly ignoring folder IDs
export function parseGoogleDriveFileIds(text) {
  if (!text) return [];

  // Extract folder ID if present to exclude it from file IDs
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

// Fetch all image file IDs inside a public Google Drive Folder
export async function fetchFilesFromGoogleDriveFolder(folderUrlOrId) {
  let folderId = folderUrlOrId.trim();
  const folderMatch = folderUrlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    folderId = folderMatch[1];
  }

  const results = [];

  try {
    const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(embedUrl)}`;
    const res = await fetch(proxyUrl);
    
    if (res.ok) {
      const html = await res.text();
      
      // Parse file links inside the folder HTML
      const fileIdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/g;
      const foundIds = new Set();
      let match;
      while ((match = fileIdRegex.exec(html)) !== null) {
        const id = match[1];
        if (id && id.length > 10 && id !== folderId) {
          foundIds.add(id);
        }
      }

      let count = 1;
      foundIds.forEach(id => {
        results.push({
          id,
          name: `Drive Photo #${count++}`,
          imageUrl: `https://lh3.googleusercontent.com/d/${id}=s1600`
        });
      });
    }
  } catch (err) {
    console.warn('Failed to parse Google Drive folder via proxy:', err);
  }

  return results;
}
