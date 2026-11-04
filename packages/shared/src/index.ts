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
}

export interface UpdatePostInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  cover_image?: string;
  status?: PostStatus;
}

export interface UploadResponse {
  key: string;
  url: string;
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
