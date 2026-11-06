export type PostStatus = 'draft' | 'published';
export type UserRole = 'admin' | 'editor' | 'author';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  status: PostStatus;
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  canonical_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePostInput {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  cover_image?: string;
  status?: PostStatus;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  canonical_url?: string;
}

export interface UpdatePostInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  cover_image?: string;
  status?: PostStatus;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  canonical_url?: string;
}

export interface UploadResponse {
  key: string;
  url: string;
}

export interface MediaItem {
  key: string;
  size: number;
  uploaded: string;
  url: string;
}

export interface RenameMediaInput {
  oldKey: string;
  newName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SetupInput {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

