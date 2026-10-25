"use client";
import { createClient } from "@supabase/supabase-js";
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Course material storage is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** XHR exposes real upload progress and abort, while bytes go straight to the signed Storage endpoint. */
export function uploadToSignedUrl(signedUrl: string, file: File, onProgress: (percent: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => { xhr.abort(); reject(new Error("Upload cancelled.")); };
    const cleanup = () => signal.removeEventListener("abort", abort);
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100))); };
    xhr.onload = () => { cleanup(); if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); } else reject(new Error("Storage upload failed. Please retry.")); };
    xhr.onerror = () => { cleanup(); reject(new Error("Upload connection failed. Please retry.")); };
    xhr.onabort = () => { cleanup(); reject(new Error("Upload cancelled.")); };
    xhr.send(file);
  });
}
