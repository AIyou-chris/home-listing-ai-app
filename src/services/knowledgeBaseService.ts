// Minimal client for Knowledge Base callable functions
// Step 1: implement file upload to backend (no UI wiring yet)

const getFunctionsBase = (): string => {
  const project = 'home-listing-ai';
  const region = 'us-central1';
  const isLocal =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  return isLocal
    ? `http://127.0.0.1:5001/${project}/${region}`
    : `https://us-central1-${project}.cloudfunctions.net`;
};

const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      // Return data URL for compatibility with backend parser
      resolve(result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

export interface UploadResult {
  fileId: string;
  downloadUrl: string;
  status: string;
}

export const uploadAgentFile = async (
  file: File,
  userId: string,
  propertyId?: string
): Promise<UploadResult> => {
  if (!file) throw new Error('file required');
  if (!userId) throw new Error('userId required');

  const baseUrl = getFunctionsBase();
  const url = `${baseUrl}/uploadFile`;
  const dataUrl = await toBase64(file);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: dataUrl,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        userId,
        propertyId: propertyId || undefined
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Upload failed: ${res.status}`, text);
      throw new Error(`uploadFile failed: ${res.status} ${text}`);
    }
    return (await res.json()) as UploadResult;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

export const processUploadedDocument = async (
  fileId: string,
  fileType: string
): Promise<{ fileId: string; extractedText: string; status: string }> => {
  const baseUrl = getFunctionsBase();
  const url = `${baseUrl}/processDocument`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, fileType })
  });
  if (!res.ok) throw new Error('processDocument failed');
  return (await res.json()) as any;
};

export const storeKnowledgeBaseEntry = async (
  fileId: string,
  userId: string,
  category: string,
  tags: string[] = []
): Promise<{ knowledgeId: string; status: string }> => {
  const baseUrl = getFunctionsBase();
  const url = `${baseUrl}/storeKnowledgeBase`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, userId, category, tags })
  });
  if (!res.ok) throw new Error('storeKnowledgeBase failed');
  return (await res.json()) as any;
};

export const listKnowledgeEntries = async (
  userId: string,
  category?: string
): Promise<{ entries: Array<{ id: string; title?: string; fileName?: string; createdAt?: any }> }> => {
  const baseUrl = getFunctionsBase();
  // FIXED: Removed 'api/' prefix from URL path
  const url = `${baseUrl}/kb/list`;
  
  try {
    console.log(`Fetching knowledge entries from: ${url}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, category })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Knowledge list error: ${res.status}`, errorText);
      throw new Error('listKnowledge failed');
    }
    
    return (await res.json()) as any;
  } catch (error) {
    console.error('Knowledge list error:', error);
    throw error;
  }
};

export const deleteKnowledgeFile = async (fileId: string): Promise<{ status: string }> => {
  const baseUrl = getFunctionsBase();
  // FIXED: Removed 'api/' prefix from URL path
  const url = `${baseUrl}/kb/delete`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Delete file error: ${res.status}`, errorText);
      throw new Error('deleteFile failed');
    }
    
    return (await res.json()) as any;
  } catch (error) {
    console.error('Delete file error:', error);
    throw error;
  }
};


