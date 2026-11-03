<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { fetchAdminPost, updatePost, uploadMedia } from '$lib/api';
  import type { PostStatus } from '@cms/shared';

  const postId = page.params.id;

  let title = $state('');
  let slug = $state('');
  let excerpt = $state('');
  let content = $state('');
  let cover_image = $state('');
  let status = $state<PostStatus>('draft');

  let loading = $state(true);
  let uploading = $state(false);
  let submitting = $state(false);
  let error = $state<string | null>(null);

  async function load() {
    loading = true;
    error = null;
    try {
      const p = await fetchAdminPost(postId);
      title = p.title;
      slug = p.slug;
      excerpt = p.excerpt || '';
      content = p.content;
      cover_image = p.cover_image || '';
      status = p.status;
    } catch (err: any) {
      error = err.message || 'Failed to load post';
    } finally {
      loading = false;
    }
  }

  async function handleFileUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    uploading = true;
    error = null;
    try {
      const res = await uploadMedia(target.files[0]);
      cover_image = res.url;
    } catch (err: any) {
      error = `Image upload to R2 failed: ${err.message}`;
    } finally {
      uploading = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!title || !slug) {
      error = 'Title and slug are required';
      return;
    }

    submitting = true;
    error = null;
    try {
      await updatePost(postId, {
        title,
        slug,
        excerpt,
        content,
        cover_image: cover_image || undefined,
        status
      });
      goto('/');
    } catch (err: any) {
      error = err.message || 'Failed to update post';
    } finally {
      submitting = false;
    }
  }

  onMount(() => {
    load();
  });
</script>

<h3>Edit Post</h3>

{#if loading}
  <p>Loading post data from D1...</p>
{:else if error}
  <p style="color: red; border: 1px solid red; padding: 8px;">{error}</p>
  <button onclick={load}>Retry</button>
{:else}
  <form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 14px;">
    <div>
      <label for="title"><strong>Title:</strong></label><br />
      <input
        id="title"
        type="text"
        bind:value={title}
        required
        style="width: 100%; padding: 6px;"
      />
    </div>

    <div>
      <label for="slug"><strong>Slug:</strong></label><br />
      <input
        id="slug"
        type="text"
        bind:value={slug}
        required
        style="width: 100%; padding: 6px;"
      />
    </div>

    <div>
      <label for="status"><strong>Status:</strong></label><br />
      <select id="status" bind:value={status} style="padding: 6px;">
        <option value="draft">Draft (Private)</option>
        <option value="published">Published (Public)</option>
      </select>
    </div>

    <div>
      <label for="cover"><strong>Cover Image (Cloudflare R2):</strong></label><br />
      <input id="cover" type="file" accept="image/*" onchange={handleFileUpload} />
      {#if uploading}
        <span>Uploading to R2...</span>
      {/if}
      {#if cover_image}
        <div style="margin-top: 6px;">
          <input type="text" bind:value={cover_image} style="width: 100%; font-size: 11px;" />
          <br />
          <img src={cover_image} alt="Cover preview" style="max-height: 120px; margin-top: 4px; border: 1px solid #ccc;" />
          <br />
          <button type="button" onclick={() => { cover_image = ''; }}>Remove Cover</button>
        </div>
      {/if}
    </div>

    <div>
      <label for="excerpt"><strong>Excerpt / Summary:</strong></label><br />
      <textarea
        id="excerpt"
        bind:value={excerpt}
        rows="2"
        style="width: 100%; padding: 6px;"
      ></textarea>
    </div>

    <div>
      <label for="content"><strong>Content (Markdown / Text):</strong></label><br />
      <textarea
        id="content"
        bind:value={content}
        rows="15"
        style="width: 100%; padding: 6px; font-family: monospace;"
      ></textarea>
    </div>

    <div style="display: flex; gap: 10px;">
      <button type="submit" disabled={submitting} style="padding: 8px 16px; font-weight: bold;">
        {submitting ? 'Updating...' : 'Save Changes'}
      </button>
      <a href="/" style="display: inline-block; padding: 8px 16px;">Cancel</a>
    </div>
  </form>
{/if}

