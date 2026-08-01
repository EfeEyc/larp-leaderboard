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

// Multi-method filename extractor for Google Drive file links
export async function fetchGoogleDriveFileName(fileId) {
  const proxies = [
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;

  for (const getProxyUrl of proxies) {
    try {
      const res = await fetch(getProxyUrl(viewUrl));
      if (res.ok) {
        const html = await res.text();
        
        // Pattern 1: og:title meta tag
        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
          const clean = formatFileNameToTitle(ogTitleMatch[1]);
          if (clean && clean !== 'Untitled LARPer' && !clean.toLowerCase().includes('google drive')) {
            return clean;
          }
        }

        // Pattern 2: HTML <title> tag
        const matchTitle = html.match(/<title>([^<]+)<\/title>/i);
        if (matchTitle && matchTitle[1]) {
          const rawTitle = matchTitle[1];
          if (rawTitle.includes('- Google Drive') || !rawTitle.toLowerCase().startsWith('google drive')) {
            const clean = formatFileNameToTitle(rawTitle);
            if (clean && clean !== 'Untitled LARPer' && !clean.toLowerCase().includes('access denied')) {
              return clean;
            }
          }
        }
      }
    } catch (e) {}
  }

  return null;
}

export async function fetchFilesFromGoogleDriveFolder(folderUrlOrId) {
  let folderId = folderUrlOrId.trim();
  const folderMatch = folderUrlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    folderId = folderMatch[1];
  }

  const results = [];

  try {
    const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(embedUrl)}`;
    const res = await fetch(proxyUrl);
    
    if (res.ok) {
      const html = await res.text();
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
      for (const id of foundIds) {
        const title = await fetchGoogleDriveFileName(id) || `Drive Photo #${count++}`;
        results.push({
          id,
          name: title,
          imageUrl: `https://lh3.googleusercontent.com/d/${id}=s1600`
        });
      }
    }
  } catch (err) {
    console.warn('Failed to parse Google Drive folder via proxy:', err);
  }

  return results;
}
