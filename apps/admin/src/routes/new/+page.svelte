<script lang="ts">
  import { goto } from '$app/navigation';
  import { createPost, uploadMedia } from '$lib/api';
  import type { PostStatus } from '@cms/shared';

  let title = $state('');
  let slug = $state('');
  let excerpt = $state('');
  let content = $state('');
  let cover_image = $state('');
  let status = $state<PostStatus>('draft');

  let uploading = $state(false);
  let submitting = $state(false);
  let error = $state<string | null>(null);

  function autoSlug() {
    slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
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
      await createPost({
        title,
        slug,
        excerpt,
        content,
        cover_image: cover_image || undefined,
        status
      });
      goto('/');
    } catch (err: any) {
      error = err.message || 'Failed to save post';
    } finally {
      submitting = false;
    }
  }
</script>

<h3>Create New Post</h3>

{#if error}
  <p style="color: red; border: 1px solid red; padding: 8px;">{error}</p>
{/if}

<form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 14px;">
  <div>
    <label for="title"><strong>Title:</strong></label><br />
    <input
      id="title"
      type="text"
      bind:value={title}
      oninput={() => { if (!slug) autoSlug(); }}
      placeholder="Post title"
      required
      style="width: 100%; padding: 6px;"
    />
  </div>

  <div>
    <label for="slug"><strong>Slug:</strong></label><br />
    <div style="display: flex; gap: 8px;">
      <input
        id="slug"
        type="text"
        bind:value={slug}
        placeholder="url-friendly-slug"
        required
        style="flex: 1; padding: 6px;"
      />
      <button type="button" onclick={autoSlug}>Generate from Title</button>
    </div>
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
        <input type="text" bind:value={cover_image} readonly style="width: 100%; font-size: 11px;" />
        <br />
        <img src={cover_image} alt="Preview" style="max-height: 120px; margin-top: 4px; border: 1px solid #ccc;" />
      </div>
    {/if}
  </div>

  <div>
    <label for="excerpt"><strong>Excerpt / Summary:</strong></label><br />
    <textarea
      id="excerpt"
      bind:value={excerpt}
      rows="2"
      placeholder="Brief description for search and listings..."
      style="width: 100%; padding: 6px;"
    ></textarea>
  </div>

  <div>
    <label for="content"><strong>Content (Markdown / Text):</strong></label><br />
    <textarea
      id="content"
      bind:value={content}
      rows="15"
      placeholder="Write your article in Markdown..."
      style="width: 100%; padding: 6px; font-family: monospace;"
    ></textarea>
  </div>

  <div style="display: flex; gap: 10px;">
    <button type="submit" disabled={submitting} style="padding: 8px 16px; font-weight: bold;">
      {submitting ? 'Saving...' : 'Create Post'}
    </button>
    <a href="/" style="display: inline-block; padding: 8px 16px;">Cancel</a>
  </div>
</form>

