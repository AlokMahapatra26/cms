<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAdminPosts, deletePost } from '$lib/api';
  import type { Post } from '@cms/shared';

  let posts = $state<Post[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

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

  onMount(() => {
    loadPosts();
  });
</script>

<h3>Posts ({posts.length})</h3>

{#if loading}
  <p>Loading posts from D1...</p>
{:else if error}
  <p style="color: red;">Error: {error}</p>
  <button onclick={loadPosts}>Retry</button>
{:else if posts.length === 0}
  <p>No posts yet. <a href="/new">Create one</a></p>
{:else}
  <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #f0f0f0; text-align: left;">
        <th>Title</th>
        <th>Slug</th>
        <th>Status</th>
        <th>Cover</th>
        <th>Created</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each posts as post (post.id)}
        <tr>
          <td>
            <strong>{post.title}</strong>
          </td>
          <td><code>/{post.slug}</code></td>
          <td>
            <span style="font-weight: bold; color: {post.status === 'published' ? 'green' : 'gray'};">
              {post.status.toUpperCase()}
            </span>
          </td>
          <td>
            {#if post.cover_image}
              <a href={post.cover_image} target="_blank" rel="noopener">view image</a>
            {:else}
              -
            {/if}
          </td>
          <td><small>{new Date(post.created_at).toLocaleDateString()}</small></td>
          <td style="white-space: nowrap;">
            <a href="/edit/{post.id}">[Edit]</a>
            <button onclick={() => handleDelete(post.id, post.title)} style="cursor: pointer; margin-left: 6px;">[Delete]</button>
            {#if post.status === 'published'}
              <a href="http://localhost:4321/posts/{post.slug}" target="_blank" rel="noopener" style="margin-left: 6px;">[Live]</a>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

