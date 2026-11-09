import {
  fetchWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  triggerWorkspaceDeploy,
  getActiveWorkspaceSlug,
  setActiveWorkspaceSlug
} from '$lib/api';
import { goto } from '$app/navigation';
import { collectionsStore } from '$lib/collections.svelte';
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput } from '@cms/shared';

const MULTI_TENANT_ENABLED_KEY = 'edgecms_multi_tenant_enabled';

class WorkspacesStore {
  list = $state<Workspace[]>([]);
  activeSlug = $state<string>('default');
  loading = $state(false);
  enabled = $state<boolean>(true);

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

      const savedEnabled = typeof window !== 'undefined' ? localStorage.getItem(MULTI_TENANT_ENABLED_KEY) : null;
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      } else {
        this.enabled = this.list.length > 1;
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

  toggleMultiTenant(enable?: boolean) {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(MULTI_TENANT_ENABLED_KEY, String(this.enabled));
    }
    if (!this.enabled && this.activeSlug !== 'default') {
      this.switchWorkspace('default');
    }
  }

  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const created = await createWorkspace(input);
    this.list = [...this.list, created];
    this.toggleMultiTenant(true);
    this.switchWorkspace(created.slug);
    return created;
  }

  async update(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const updated = await updateWorkspace(id, input);
    this.list = this.list.map((w) => (w.id === id ? updated : w));
    if (this.active.id === id && updated.slug !== this.activeSlug) {
      this.switchWorkspace(updated.slug);
    }
    return updated;
  }

  async deploy(id: string): Promise<{ success: boolean; status: string; timestamp: string }> {
    const res = await triggerWorkspaceDeploy(id);
    this.list = this.list.map((w) =>
      w.id === id
        ? { ...w, last_deployed_at: res.timestamp, last_deploy_status: res.status }
        : w
    );
    return res;
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
