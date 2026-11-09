import {
  fetchWorkspaces,
  createWorkspace,
  deleteWorkspace,
  getActiveWorkspaceSlug,
  setActiveWorkspaceSlug
} from '$lib/api';
import { goto } from '$app/navigation';
import { collectionsStore } from '$lib/collections.svelte';
import type { Workspace, CreateWorkspaceInput } from '@cms/shared';

class WorkspacesStore {
  list = $state<Workspace[]>([]);
  activeSlug = $state<string>('default');
  loading = $state(false);

  get active(): Workspace {
    const found = this.list.find((w) => w.slug === this.activeSlug);
    return (
      found ||
      this.list[0] || {
        id: 'ws_default',
        name: 'Default Workspace',
        slug: 'default',
        api_key: 'cf_live_default_key',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    );
  }

  async load() {
    this.loading = true;
    try {
      const data = await fetchWorkspaces();
      this.list = data;

      const saved = getActiveWorkspaceSlug();
      if (this.list.some((w) => w.slug === saved)) {
        this.activeSlug = saved;
      } else if (this.list.length > 0) {
        this.activeSlug = this.list[0].slug;
        setActiveWorkspaceSlug(this.activeSlug);
      }
    } catch (e) {
      // ignore
    } finally {
      this.loading = false;
    }
  }

  switchWorkspace(slug: string) {
    if (this.activeSlug === slug) return;
    this.activeSlug = slug;
    setActiveWorkspaceSlug(slug);
    // Reload collections for the newly selected client workspace
    collectionsStore.load();
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/content/')) {
      goto('/schemas');
    }
  }

  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const created = await createWorkspace(input);
    this.list = [...this.list, created];
    this.switchWorkspace(created.slug);
    return created;
  }

  async remove(id: string) {
    await deleteWorkspace(id);
    this.list = this.list.filter((w) => w.id !== id);
    if (this.active.id === id) {
      this.switchWorkspace(this.list[0]?.slug || 'default');
    }
  }
}

export const workspacesStore = new WorkspacesStore();
