/**
 * Google Drive API Helpers
 */

export interface DriveUploadResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

export async function getOrCreateDevelopFolder(accessToken: string): Promise<string> {
  const folderName = 'Sviluppo Foto AI';
  try {
    // 1. Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!searchRes.ok) {
      throw new Error(`Failed to search folder: ${searchRes.statusText}`);
    }
    
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
    
    // 2. Create if not exists
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    
    if (!createRes.ok) {
      throw new Error(`Failed to create folder: ${createRes.statusText}`);
    }
    
    const createData = await createRes.json();
    return createData.id;
  } catch (error) {
    console.error('getOrCreateDevelopFolder error:', error);
    throw error;
  }
}

export async function uploadBase64ToDrive(
  accessToken: string,
  folderId: string,
  filename: string,
  base64DataWithPrefix: string
): Promise<DriveUploadResponse> {
  try {
    // Extract raw base64 data and mime type
    const match = base64DataWithPrefix.match(/^data:([^;]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let rawBase64 = base64DataWithPrefix;
    if (match) {
      mimeType = match[1];
      rawBase64 = match[2];
    }

    const metadata = {
      name: filename,
      mimeType: mimeType,
      parents: [folderId]
    };

    const boundary = 'drive_upload_boundary_xxx';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const body = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      rawBase64 +
      closeDelim;

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink';
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive upload failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('uploadBase64ToDrive error:', error);
    throw error;
  }
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export async function listFilesFromFolder(accessToken: string, folderId: string): Promise<DriveFile[]> {
  try {
    const fields = 'files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink)';
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=${encodeURIComponent(fields)}&pageSize=100`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      throw new Error(`Failed to list files from Drive: ${response.statusText}`);
    }
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('listFilesFromFolder error:', error);
    throw error;
  }
}

export async function downloadFileAsBase64(accessToken: string, fileId: string): Promise<string> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('downloadFileAsBase64 error:', error);
    throw error;
  }
}

export async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<void> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  } catch (error) {
    console.error('deleteFileFromDrive error:', error);
    throw error;
  }
}
