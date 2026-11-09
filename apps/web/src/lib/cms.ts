export interface CMSContentItem {
  id: string;
  collection_slug: string;
  status: 'draft' | 'published';
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const API_BASE = import.meta.env.CMS_API_URL || 'http://localhost:8787';

/**
 * Fetch published content items for a collection
 */
export async function getCMSContent(
  collectionSlug: string,
  workspaceSlug: string = 'default'
): Promise<CMSContentItem[]> {
  try {
    const url = `${API_BASE}/api/v1/${workspaceSlug}/content/${collectionSlug}?status=published&populate=true`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const items = await res.json();
    return Array.isArray(items) ? items : [];
  } catch (e) {
    console.warn(`[EdgeCMS Client] Could not fetch ${collectionSlug} from ${API_BASE}:`, (e as any).message);
    return [];
  }
}

/**
 * Fetch a single item by ID or Slug
 */
export async function getCMSContentItem(
  collectionSlug: string,
  id: string,
  workspaceSlug: string = 'default'
): Promise<CMSContentItem | null> {
  try {
    const url = `${API_BASE}/api/v1/${workspaceSlug}/content/${collectionSlug}/${id}?populate=true`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

