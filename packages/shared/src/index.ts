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


// -------------------------------------------------------------
// DYNAMIC SCHEMA & CONTENT TYPES (Headless CMS Engine)
// -------------------------------------------------------------

export type FieldType =
  | 'text'
  | 'longtext'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'media'
  | 'select';

export interface FieldDefinition {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select dropdown
  description?: string;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  fields: FieldDefinition[];
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  fields: FieldDefinition[];
}

export interface UpdateCollectionInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  fields?: FieldDefinition[];
}

export interface ContentItem {
  id: string;
  collection_slug: string;
  status: 'draft' | 'published';
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateContentItemInput {
  status?: 'draft' | 'published';
  data: Record<string, any>;
}

export interface UpdateContentItemInput {
  status?: 'draft' | 'published';
  data?: Record<string, any>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Code-First Schema Builder API
export * from './builder';
export * from './config';



