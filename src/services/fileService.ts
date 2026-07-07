const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
const TOKEN_KEY = 'procurement_token';

export interface UploadedFile {
  uid: string;
  url: string;
  mime: string;
  size: number;
}

export const fileService = {
  /** Faylı yükləyir; onProgress faiz (0–100) qaytarır (XHR upload progress). */
  upload(file: File, onProgress?: (percent: number) => void): Promise<UploadedFile> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/files`);
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          let msg = 'Upload failed';
          try { msg = JSON.parse(xhr.responseText).message ?? msg; } catch { /* ignore */ }
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));

      const fd = new FormData();
      fd.append('file', file);
      xhr.send(fd);
    });
  },
};

/** Faylın serve URL-i (uid → /files/{uid} redirect). */
export function fileUrl(uid: string | null | undefined): string | null {
  if (!uid) return null;
  return `${BASE_URL}/files/${uid}`;
}
