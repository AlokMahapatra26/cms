<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAdminPosts, deletePost } from '$lib/api';
  import type { Post } from '@cms/shared';

  let posts = $state<Post[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let filter = $state<'all' | 'published' | 'draft'>('all');

  async function loadPosts() {
    loading = true;
    error = null;
    try {
      posts = await fetchAdminPosts();
    } catch (e: any) {
      error = e.message || 'Error loading posts';
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deletePost(id);
      posts = posts.filter((p) => p.id !== id);
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  }

  const filteredPosts = $derived(
    posts.filter((p) => {
      if (filter === 'all') return true;
      return p.status === filter;
    })
  );

  onMount(() => {
    loadPosts();
  });
</script>

<div style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
  <div>
    <h1 style="font-size: 36px; font-weight: 700; color: #141414; margin: 0 0 6px 0; letter-spacing: -0.02em;">
      Articles.
    </h1>
    <p style="font-size: 16px; color: #707070; margin: 0; font-weight: 400;">
      Publish and manage content distributed globally on Cloudflare edge.
    </p>
  </div>

  <!-- Segmented Control for filtering -->
  <div class="segmented-control">
    <button
      class="segment-item {filter === 'all' ? 'active' : ''}"
      onclick={() => (filter = 'all')}
    >
      All ({posts.length})
    </button>
    <button
      class="segment-item {filter === 'published' ? 'active' : ''}"
      onclick={() => (filter = 'published')}
    >
      Published ({posts.filter(p => p.status === 'published').length})
    </button>
    <button
      class="segment-item {filter === 'draft' ? 'active' : ''}"
      onclick={() => (filter = 'draft')}
    >
      Drafts ({posts.filter(p => p.status === 'draft').length})
    </button>
  </div>
</div>

{#if loading}
  <div style="background-color: #f3f3f3; border-radius: 24px; padding: 48px; text-align: center; color: #707070;">
    <p style="margin: 0; font-size: 15px;">Loading articles from D1 edge database...</p>
  </div>
{:else if error}
  <div style="background-color: #fff0f0; border: 1px solid #ffcdd2; border-radius: 16px; padding: 20px; color: #d32f2f; margin-bottom: 24px;">
    <strong>Error loading posts:</strong> {error}
    <div style="margin-top: 10px;">
      <button class="btn-primary" onclick={loadPosts}>Retry</button>
    </div>
  </div>
{:else if filteredPosts.length === 0}
  <div style="background-color: #f3f3f3; border-radius: 24px; padding: 64px 24px; text-align: center;">
    <div style="width: 48px; height: 48px; background: #e0e0e0; border-radius: 30%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 20px;">
      ✍️
    </div>
    <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">No articles found</h3>
    <p style="color: #707070; margin: 0 0 20px 0; font-size: 14px;">
      {filter === 'all' ? 'Get started by creating your first article.' : `No articles in ${filter} status.`}
    </p>
    <a href="/new" class="btn-primary">+ Create New Article</a>
  </div>
{:else}
  <div class="table-card">
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 60px;">Cover</th>
          <th>Title & Excerpt</th>
          <th>Slug</th>
          <th>Status</th>
          <th>Published</th>
          <th style="text-align: right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredPosts as post (post.id)}
          <tr>
            <td>
              {#if post.cover_image}
                <img
                  src={post.cover_image}
                  alt={post.title}
                  class="squircle-thumb"
                />
              {:else}
                <div class="squircle-thumb" style="display: flex; align-items: center; justify-content: center; color: #adadad; font-size: 12px; font-weight: 600;">
                  TXT
                </div>
              {/if}
            </td>
            <td>
              <div style="font-weight: 600; color: #141414; font-size: 15px; margin-bottom: 2px;">
                {post.title}
              </div>
              {#if post.excerpt}
                <div style="font-size: 13px; color: #707070; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {post.excerpt}
                </div>
              {/if}
            </td>
            <td>
              <code style="background-color: #f0f0f0; padding: 3px 8px; border-radius: 6px; font-size: 12px; color: #262626; font-family: monospace;">
                /{post.slug}
              </code>
            </td>
            <td>
              {#if post.status === 'published'}
                <span class="badge-popular">
                  PUBLISHED
                </span>
              {:else}
                <span class="badge-draft">
                  DRAFT
                </span>
              {/if}
            </td>
            <td>
              <span style="font-size: 13px; color: #707070;">
                {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <div style="display: inline-flex; gap: 6px;">
                {#if post.status === 'published'}
                  <a
                    href="http://localhost:4321/posts/{post.slug}"
                    target="_blank"
                    rel="noopener"
                    class="btn-pill-soft"
                    title="View live static site"
                  >
                    Live ↗
                  </a>
                {/if}
                <a href="/edit/{post.id}" class="btn-pill-soft">
                  Edit
                </a>
                <button
                  onclick={() => handleDelete(post.id, post.title)}
                  class="btn-danger-soft"
                  title="Delete post"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
