<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAdminPosts, updatePost, deletePost } from '$lib/api';
  import type { Post, PostStatus } from '@cms/shared';

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
      error = e.message || 'Error loading articles';
    } finally {
      loading = false;
    }
  }

  async function handleTogglePublish(post: Post) {
    const nextStatus: PostStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const updated = await updatePost(post.id, { status: nextStatus });
      posts = posts.map((p) => (p.id === post.id ? updated : p));
    } catch (e: any) {
      alert(`Failed to update status: ${e.message}`);
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

<!-- Header & Controls -->
<div style="margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
  <div>
    <h1 style="font-size: 32px; font-weight: 400; color: #000000; margin: 0 0 6px 0; letter-spacing: -0.01em;">
      Articles
    </h1>
    <p style="font-size: 14px; color: #71717a; margin: 0; font-weight: 400;">
      Manage blog posts, announcements, and content distributed globally.
    </p>
  </div>

  <!-- Shopify Segmented Filter -->
  <div class="shopify-segmented">
    <button
      class="shopify-segment-btn {filter === 'all' ? 'active' : ''}"
      onclick={() => (filter = 'all')}
    >
      All ({posts.length})
    </button>
    <button
      class="shopify-segment-btn {filter === 'published' ? 'active' : ''}"
      onclick={() => (filter = 'published')}
    >
      Published ({posts.filter(p => p.status === 'published').length})
    </button>
    <button
      class="shopify-segment-btn {filter === 'draft' ? 'active' : ''}"
      onclick={() => (filter = 'draft')}
    >
      Drafts ({posts.filter(p => p.status === 'draft').length})
    </button>
  </div>
</div>

{#if loading}
  <div class="shopify-card" style="padding: 48px; text-align: center; color: #71717a;">
    <p style="margin: 0; font-size: 14px;">Loading articles from D1 edge database...</p>
  </div>
{:else if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 20px; color: #b91c1c; margin-bottom: 24px;">
    <strong>Error loading posts:</strong> {error}
    <div style="margin-top: 10px;">
      <button class="btn-primary-pill" onclick={loadPosts}>Retry</button>
    </div>
  </div>
{:else if filteredPosts.length === 0}
  <div class="shopify-card" style="padding: 64px 24px; text-align: center;">
    <div style="width: 48px; height: 48px; background: #c1fbd4; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 20px;">
      🛍️
    </div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">No articles found</h3>
    <p style="color: #71717a; margin: 0 0 20px 0; font-size: 14px;">
      {filter === 'all' ? 'Create your first article to publish to your storefront.' : `No articles in ${filter} status.`}
    </p>
    <a href="/new" class="btn-primary-pill">+ Create New Article</a>
  </div>
{:else}
  <div class="shopify-card">
    <table class="shopify-table">
      <thead>
        <tr>
          <th style="width: 60px;">Cover</th>
          <th>Title & Excerpt</th>
          <th>Slug</th>
          <th>Status</th>
          <th>Date</th>
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
                <div class="squircle-thumb" style="display: flex; align-items: center; justify-content: center; color: #a1a1aa; font-size: 11px; font-weight: 600;">
                  POST
                </div>
              {/if}
            </td>
            <td>
              <div style="font-weight: 600; color: #000000; font-size: 15px; margin-bottom: 2px;">
                {post.title}
              </div>
              {#if post.excerpt}
                <div style="font-size: 13px; color: #71717a; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {post.excerpt}
                </div>
              {/if}
            </td>
            <td>
              <code style="background-color: #f4f4f5; padding: 3px 8px; border-radius: 6px; font-size: 12px; color: #3f3f46; font-family: monospace;">
                /{post.slug}
              </code>
            </td>
            <td>
              {#if post.status === 'published'}
                <span class="pill-tag-mint">
                  Published
                </span>
              {:else}
                <span class="pill-tag-shade">
                  Draft
                </span>
              {/if}
            </td>
            <td>
              <span style="font-size: 13px; color: #71717a;">
                {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <div style="display: inline-flex; align-items: center; gap: 6px;">
                {#if post.status === 'draft'}
                  <button
                    onclick={() => handleTogglePublish(post)}
                    class="btn-sm-pill btn-aloe-sm"
                    title="Publish immediately to public blog"
                  >
                    Publish
                  </button>
                {:else}
                  <a
                    href="http://localhost:4321/posts/{post.slug}"
                    target="_blank"
                    rel="noopener"
                    class="btn-sm-pill btn-gray-sm"
                    title="View live static site"
                  >
                    Live ↗
                  </a>
                  <button
                    onclick={() => handleTogglePublish(post)}
                    class="btn-sm-pill btn-gray-sm"
                    title="Revert article to draft"
                  >
                    Unpublish
                  </button>
                {/if}
                <a href="/edit/{post.id}" class="btn-sm-pill btn-gray-sm">
                  Edit
                </a>
                <button
                  onclick={() => handleDelete(post.id, post.title)}
                  class="btn-sm-pill btn-danger-sm"
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
