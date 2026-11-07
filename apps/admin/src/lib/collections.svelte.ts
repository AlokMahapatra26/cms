import { fetchCollections } from '$lib/api';
import type { Collection } from '@cms/shared';

class CollectionsStore {
  list = $state<Collection[]>([]);
  loading = $state(false);

  async load() {
    this.loading = true;
    try {
      this.list = await fetchCollections();
    } catch (e) {
      // ignore if unauthenticated or not yet ready
    } finally {
      this.loading = false;
    }
  }

  add(col: Collection) {
    this.list = [...this.list.filter((c) => c.slug !== col.slug), col].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  remove(slug: string) {
    this.list = this.list.filter((c) => c.slug !== slug);
  }
}

export const collectionsStore = new CollectionsStore();
