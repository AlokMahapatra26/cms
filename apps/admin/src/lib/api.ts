import type { Post, CreatePostInput, UpdatePostInput, UploadResponse } from '@cms/shared';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8787';

export async function fetchAdminPosts(): Promise<Post[]> {
  const res = await fetch(`${API_BASE}/api/admin/posts`);
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

export async function fetchAdminPost(id: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/admin/posts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch post');
  return res.json();
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/admin/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create post');
  }
  return res.json();
}

export async function updatePost(id: string, input: UpdatePostInput): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/admin/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update post');
  }
  return res.json();
}

export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/posts/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete post');
}

export async function uploadMedia(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Upload failed');
  }

  const data = await res.json();
  // If the returned URL is relative (e.g. /api/media/...), prefix with API_BASE
  const fullUrl = data.url.startsWith('http') ? data.url : `${API_BASE}${data.url}`;
  return { key: data.key, url: fullUrl };
}

