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

export function parseGoogleDriveFileIds(text) {
  if (!text) return [];
  const fileIdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)|[?&]id=([a-zA-Z0-9_-]+)|\/folders\/([a-zA-Z0-9_-]+)/g;
  const ids = new Set();
  let match;
  while ((match = fileIdRegex.exec(text)) !== null) {
    const id = match[1] || match[2] || match[3];
    if (id && id.length > 10) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

// Fetch all photos & filenames directly inside a Google Drive Folder URL
export async function fetchFilesFromGoogleDriveFolder(folderUrlOrId) {
  let folderId = folderUrlOrId.trim();
  const folderMatch = folderUrlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    folderId = folderMatch[1];
  }

  const results = [];

  try {
    const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(embedUrl)}`;
    const res = await fetch(proxyUrl);
    
    if (res.ok) {
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      // Select item entries in drive folder list/grid view
      const items = doc.querySelectorAll('.drive-viewer-tile, .item-name, [data-id]');
      items.forEach(el => {
        const id = el.getAttribute('data-id') || el.id;
        const textEl = el.querySelector('.drive-viewer-tile-title, .item-name') || el;
        const name = textEl ? textEl.textContent.trim() : '';

        if (id && id.length > 10 && !results.some(r => r.id === id)) {
          results.push({
            id,
            name: formatFileNameToTitle(name),
            imageUrl: `https://lh3.googleusercontent.com/d/${id}=s1600`
          });
        }
      });

      // Fallback regex scan for file IDs in HTML
      if (results.length === 0) {
        const fileRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/g;
        let match;
        while ((match = fileRegex.exec(html)) !== null) {
          const id = match[1];
          if (id && id.length > 10 && !results.some(r => r.id === id)) {
            results.push({
              id,
              name: `Drive LARPer #${results.length + 1}`,
              imageUrl: `https://lh3.googleusercontent.com/d/${id}=s1600`
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to parse Google Drive folder via proxy:', err);
  }

  return results;
}
