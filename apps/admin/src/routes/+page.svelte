<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fetchAdminPosts, updatePost, deletePost } from '$lib/api';
  import { modal } from '$lib/modal.svelte';
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
      if (e.message === 'UNAUTHORIZED') {
        goto('/login');
        return;
      }
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
      await modal.alert({
        title: 'Status Update Failed',
        message: e.message || 'Failed to update article status',
        variant: 'danger'
      });
    }
  }

  async function handleDelete(id: string, title: string) {
    const confirmed = await modal.confirm({
      title: 'Delete Article?',
      message: `Are you sure you want to permanently delete "${title}"? This action cannot be undone.`,
      confirmText: 'Delete Article',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await deletePost(id);
      posts = posts.filter((p) => p.id !== id);
    } catch (e: any) {
      await modal.alert({
        title: 'Delete Failed',
        message: e.message || 'Failed to delete article',
        variant: 'danger'
      });
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
<div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <div>
    <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0 0 2px 0; letter-spacing: -0.01em;">
      Articles
    </h1>
    <p style="font-size: 12.5px; color: #71717a; margin: 0;">
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
  <div class="shopify-card" style="padding: 36px; text-align: center; color: #71717a;">
    <p style="margin: 0; font-size: 13px;">Loading articles from D1 edge database...</p>
  </div>
{:else if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 18px; color: #b91c1c; margin-bottom: 20px; font-size: 13px;">
    <strong>Error loading posts:</strong> {error}
    <div style="margin-top: 8px;">
      <button class="btn-primary-pill" onclick={loadPosts}>Retry</button>
    </div>
  </div>
{:else if filteredPosts.length === 0}
  <div class="shopify-card" style="padding: 48px 20px; text-align: center;">
    <div style="width: 40px; height: 40px; background: #c1fbd4; border-radius: 50%; margin: 0 auto 12px auto; display: flex; align-items: center; justify-content: center; font-size: 18px;">
      🛍️
    </div>
    <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600;">No articles found</h3>
    <p style="color: #71717a; margin: 0 0 16px 0; font-size: 13px;">
      {filter === 'all' ? 'Create your first article to publish to your storefront.' : `No articles in ${filter} status.`}
    </p>
    <a href="/new" class="btn-primary-pill">+ Create New Article</a>
  </div>
{:else}
  <div class="shopify-card" style="overflow-x: auto;">
    <table class="shopify-table">
      <thead>
        <tr>
          <th style="width: 44px; text-align: center;">Cover</th>
          <th style="min-width: 180px;">Title & Excerpt</th>
          <th style="width: 130px;">Slug</th>
          <th style="width: 80px;">Status</th>
          <th style="width: 95px;">Date</th>
          <th style="width: 170px; text-align: right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredPosts as post (post.id)}
          <tr>
            <td style="text-align: center; width: 44px;">
              {#if post.cover_image}
                <img
                  src={post.cover_image}
                  alt={post.title}
                  class="squircle-thumb"
                />
              {:else}
                <div class="squircle-thumb" style="display: flex; align-items: center; justify-content: center; color: #a1a1aa; font-size: 10px; font-weight: 600;">
                  POST
                </div>
              {/if}
            </td>
            <td>
              <div style="font-weight: 600; color: #000000; font-size: 13px; line-height: 1.3; margin-bottom: 2px;">
                {post.title}
              </div>
              {#if post.excerpt}
                <div style="font-size: 11.5px; color: #71717a; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {post.excerpt}
                </div>
              {/if}
            </td>
            <td style="white-space: nowrap;">
              <code style="background-color: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #3f3f46; font-family: monospace; white-space: nowrap; display: inline-block;">
                /{post.slug}
              </code>
            </td>
            <td style="white-space: nowrap;">
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
            <td style="white-space: nowrap; font-size: 12px; color: #71717a;">
              {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <div style="display: inline-flex; align-items: center; gap: 4px;">
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
