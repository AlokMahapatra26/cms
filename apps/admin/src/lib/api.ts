import type {
  Post,
  CreatePostInput,
  UpdatePostInput,
  UploadResponse,
  MediaItem,
  User,
  LoginInput,
  SetupInput,
  AuthResponse,
  UpdateProfileInput,
  ChangePasswordInput
} from '@cms/shared';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8787';
const TOKEN_KEY = 'edgecms_auth_token';

// -------------------------------------------------------------
// TOKEN MANAGEMENT
// -------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// -------------------------------------------------------------
// AUTHENTICATION API
// -------------------------------------------------------------

export async function getSetupStatus(): Promise<{ needsSetup: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/setup-status`);
  if (!res.ok) throw new Error('Failed to verify setup status');
  return res.json();
}

export async function setupAdmin(input: SetupInput): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to complete setup');
  }

  setToken(data.token);
  return data;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid email or password');
  }

  setToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch {
    // Ignore network error on logout
  } finally {
    clearToken();
  }
}

export async function getMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    clearToken();
    throw new Error('Session invalid or expired');
  }

  const data = await res.json();
  return data.user;
}

export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const res = await fetch(`${API_BASE}/api/admin/profile`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }

  return data;
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/password`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update password');
  }
}

// -------------------------------------------------------------
// ADMIN CONTENT MANAGEMENT API
// -------------------------------------------------------------

export async function fetchAdminPosts(): Promise<Post[]> {
  const res = await fetch(`${API_BASE}/api/admin/posts`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

export async function fetchAdminPost(id: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/admin/posts/${id}`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) throw new Error('Failed to fetch post');
  return res.json();
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/admin/posts`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create post');
  }

  return res.json();
}

export async function updatePost(id: string, input: UpdatePostInput): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/admin/posts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update post');
  }

  return res.json();
}

export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/posts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) throw new Error('Failed to delete post');
}

export async function uploadMedia(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Upload failed');
  }

  const data = await res.json();
  const fullUrl = data.url.startsWith('http') ? data.url : `${API_BASE}${data.url}`;
  return { key: data.key, url: fullUrl };
}

export async function fetchMediaItems(): Promise<MediaItem[]> {
  const res = await fetch(`${API_BASE}/api/admin/media`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) throw new Error('Failed to fetch media');
  const items: MediaItem[] = await res.json();
  return items.map((item) => ({
    ...item,
    url: item.url.startsWith('http') ? item.url : `${API_BASE}${item.url}`
  }));
}

export async function deleteMedia(key: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/media/${key}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete media asset');
  }
}

export async function renameMedia(oldKey: string, newName: string): Promise<MediaItem> {
  const res = await fetch(`${API_BASE}/api/admin/media/rename`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ oldKey, newName })
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to rename media asset');
  }

  const item: MediaItem = await res.json();
  return {
    ...item,
    url: item.url.startsWith('http') ? item.url : `${API_BASE}${item.url}`
  };
}
