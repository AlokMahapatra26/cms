/**
 * EdgeCMS Client & Next.js BFF (Backend For Frontend) SDK
 *
 * Implements Layer 1 (X-API-Key header) & Layer 2 (Server-Side Concealment).
 * In Next.js (Server Components / Server Actions) and Astro, all requests are executed
 * on the server using CMS_API_SECRET_KEY, completely hiding the EdgeCMS Worker URL
 * and Secret Key from browser F12 DevTools Network Tab.
 */

export interface EdgeCMSClientConfig {
  /**
   * Base URL of the EdgeCMS Cloudflare Worker API.
   * Defaults to process.env.CMS_API_URL or 'http://localhost:8787'.
   */
  apiUrl?: string;

  /**
   * Secret Read API key for EdgeCMS.
   * In Next.js, read from process.env.CMS_API_SECRET_KEY (do NOT prefix with NEXT_PUBLIC_).
   * Defaults to 'cf_live_default_key'.
   */
  apiKey?: string;

  /**
   * Active workspace slug (e.g. 'default', 'nike', 'acme').
   * Defaults to 'default'.
   */
  workspaceSlug?: string;

  /**
   * Custom fetch function (optional, defaults to global fetch).
   */
  fetch?: typeof fetch;
}

export interface CMSFetchOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  populate?: boolean;
  revalidate?: number | false; // Next.js ISR revalidation in seconds
  tags?: string[]; // Next.js cache tags
}

export class EdgeCMSClient {
  private apiUrl: string;
  private apiKey: string;
  private workspaceSlug: string;
  private customFetch: typeof fetch;

  constructor(config: EdgeCMSClientConfig = {}) {
    const envApiUrl =
      typeof process !== 'undefined' && process.env?.CMS_API_URL
        ? process.env.CMS_API_URL
        : undefined;
    const envApiKey =
      typeof process !== 'undefined'
        ? process.env?.CMS_API_SECRET_KEY || process.env?.CMS_API_KEY
        : undefined;

    this.apiUrl = (config.apiUrl || envApiUrl || 'http://localhost:8787').replace(/\/+$/, '');
    this.apiKey = config.apiKey || envApiKey || 'cf_live_default_key';
    this.workspaceSlug = config.workspaceSlug || 'default';
    this.customFetch = config.fetch || globalThis.fetch;
  }

  /**
   * Fetch published content items for a collection
   */
  async getContent<T = Record<string, any>>(
    collectionSlug: string,
    options: CMSFetchOptions = {}
  ): Promise<Array<{ id: string; collection_slug: string; data: T; created_at: string; updated_at: string }>> {
    const params = new URLSearchParams();
    params.set('status', 'published');
    if (options.populate) params.set('populate', 'true');
    if (options.page) params.set('page', options.page.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.search) params.set('search', options.search);
    if (options.sort) params.set('sort', options.sort);
    if (options.order) params.set('order', options.order);

    const path =
      this.workspaceSlug && this.workspaceSlug !== 'default'
        ? `/api/v1/${this.workspaceSlug}/content/${collectionSlug}`
        : `/api/content/${collectionSlug}`;

    const url = `${this.apiUrl}${path}?${params.toString()}`;

    const fetchInit: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
      headers: {
        Accept: 'application/json',
        'X-API-Key': this.apiKey
      }
    };

    if (options.revalidate !== undefined || options.tags !== undefined) {
      fetchInit.next = {
        revalidate: options.revalidate,
        tags: options.tags
      };
    }

    try {
      const res = await this.customFetch(url, fetchInit);
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.warn(`[EdgeCMS Client] ${res.status} ${res.statusText} fetching '${collectionSlug}':`, errorText);
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    } catch (err: any) {
      console.error(`[EdgeCMS Client] Network error fetching '${collectionSlug}':`, err.message);
      return [];
    }
  }

  /**
   * Fetch a single content item by ID or Slug
   */
  async getContentItem<T = Record<string, any>>(
    collectionSlug: string,
    id: string,
    options: { populate?: boolean; revalidate?: number | false; tags?: string[] } = {}
  ): Promise<{ id: string; collection_slug: string; data: T; created_at: string; updated_at: string } | null> {
    const params = new URLSearchParams();
    if (options.populate) params.set('populate', 'true');

    const path =
      this.workspaceSlug && this.workspaceSlug !== 'default'
        ? `/api/v1/${this.workspaceSlug}/content/${collectionSlug}/${id}`
        : `/api/content/${collectionSlug}/${id}`;

    const url = `${this.apiUrl}${path}?${params.toString()}`;

    const fetchInit: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
      headers: {
        Accept: 'application/json',
        'X-API-Key': this.apiKey
      }
    };

    if (options.revalidate !== undefined || options.tags !== undefined) {
      fetchInit.next = {
        revalidate: options.revalidate,
        tags: options.tags
      };
    }

    try {
      const res = await this.customFetch(url, fetchInit);
      if (!res.ok) return null;
      return await res.json();
    } catch (err: any) {
      console.error(`[EdgeCMS Client] Network error fetching '${collectionSlug}/${id}':`, err.message);
      return null;
    }
  }
}

/**
 * Factory helper to create an EdgeCMS Client
 */
export function createEdgeCMSClient(config?: EdgeCMSClientConfig): EdgeCMSClient {
  return new EdgeCMSClient(config);
}
