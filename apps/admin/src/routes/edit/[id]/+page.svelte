<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { fetchAdminPost, updatePost, uploadMedia } from '$lib/api';
  import RichTextEditor from '$lib/RichTextEditor.svelte';
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
      error = `R2 asset upload failed: ${err.message}`;
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
      error = err.message || 'Failed to update article';
    } finally {
      submitting = false;
    }
  }

  onMount(() => {
    load();
  });
</script>

<div style="margin-bottom: 16px;">
  <div style="margin-bottom: 4px;">
    <a href="/" style="font-size: 12px; color: #71717a; text-decoration: none;">&larr; Back to articles</a>
  </div>
  <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0; letter-spacing: -0.01em;">
    Edit Article
  </h1>
  <p style="color: #71717a; font-size: 12.5px; margin: 2px 0 0 0;">
    Update content stored in D1 database and media on R2.
  </p>
</div>

{#if loading}
  <div class="shopify-card" style="padding: 36px; text-align: center; color: #71717a;">
    <p style="margin: 0; font-size: 13px;">Loading article details...</p>
  </div>
{:else if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; color: #b91c1c; margin-bottom: 16px; font-size: 13px;">
    <strong>Error:</strong> {error}
    <div style="margin-top: 8px;">
      <button class="btn-primary-pill" onclick={load}>Retry</button>
    </div>
  </div>
{:else}
  <div class="shopify-card" style="padding: 20px;">
    <form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Title -->
      <div>
        <label for="title" style="display: block; font-size: 13px; font-weight: 600; color: #000000; margin-bottom: 8px;">
          Title
        </label>
        <input
          id="title"
          type="text"
          class="shopify-input"
          bind:value={title}
          placeholder="Enter article title..."
          required
        />
      </div>

      <!-- Slug -->
      <div>
        <label for="slug" style="display: block; font-size: 13px; font-weight: 600; color: #000000; margin-bottom: 8px;">
          Slug / URL Handle
        </label>
        <input
          id="slug"
          type="text"
          class="shopify-input"
          bind:value={slug}
          placeholder="article-url-handle"
          required
        />
      </div>

      <!-- Visibility -->
      <div>
        <div style="font-size: 13px; font-weight: 600; color: #000000; margin-bottom: 8px;">
          Visibility
        </div>
        <div class="shopify-segmented">
          <button
            type="button"
            class="shopify-segment-btn {status === 'draft' ? 'active' : ''}"
            onclick={() => (status = 'draft')}
          >
            Draft (Hidden)
          </button>
          <button
            type="button"
            class="shopify-segment-btn {status === 'published' ? 'active' : ''}"
            onclick={() => (status = 'published')}
          >
            Visible (Published)
          </button>
        </div>
      </div>

      <!-- Cover Image -->
      <div>
        <div style="font-size: 13px; font-weight: 600; color: #000000; margin-bottom: 8px;">
          Featured Media (Cloudflare R2)
        </div>
        {#if cover_image}
          <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src={cover_image} alt="Cover Preview" class="squircle-thumb" style="width: 56px; height: 56px;" />
              <div>
                <div style="font-size: 13px; font-weight: 600; color: #000000;">Cover attached</div>
                <div style="font-size: 12px; color: #71717a; word-break: break-all;">{cover_image}</div>
              </div>
            </div>
            <button type="button" onclick={() => { cover_image = ''; }} class="btn-sm-pill btn-danger-sm">
              Remove
            </button>
          </div>
        {:else}
          <div style="border: 2px dashed #d4d4d8; border-radius: 12px; padding: 28px; text-align: center; background-color: #fafafa;">
            <input
              id="cover"
              type="file"
              accept="image/*"
              onchange={handleFileUpload}
              style="display: none;"
            />
            <label for="cover" class="btn-outline-pill" style="cursor: pointer; font-size: 13px;">
              {uploading ? 'Uploading to R2...' : 'Add Featured Image'}
            </label>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #71717a;">
              Accepts PNG, JPG, WebP up to 10MB stored directly in Cloudflare R2
            </p>
          </div>
        {/if}
      </div>

      <!-- Excerpt -->
      <div>
        <label for="excerpt" style="display: block; font-size: 13px; font-weight: 600; color: #000000; margin-bottom: 8px;">
          Summary / Excerpt
        </label>
        <textarea
          id="excerpt"
          class="shopify-input"
          bind:value={excerpt}
          rows="2"
        ></textarea>
      </div>

      <!-- Content -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <label for="content" style="font-size: 13px; font-weight: 600; color: #000000;">
            Article Content (Rich Text WYSIWYG)
          </label>
          <span style="font-size: 11.5px; color: #71717a;">Formats as clean HTML for storefront</span>
        </div>
        <RichTextEditor bind:content={content} />
      </div>

      <!-- Actions -->
      <div style="display: flex; gap: 12px; align-items: center; padding-top: 14px; border-top: 1px solid #e4e4e7; flex-wrap: wrap;">
        {#if status === 'draft'}
          <button
            type="button"
            disabled={submitting}
            onclick={() => {
              status = 'published';
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            class="btn-aloe-pill"
          >
            {submitting ? 'Publishing...' : 'Publish Article'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onclick={() => {
              status = 'draft';
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            class="btn-outline-pill"
          >
            {submitting ? 'Saving...' : 'Save Draft'}
          </button>
        {:else}
          <button
            type="submit"
            disabled={submitting}
            class="btn-primary-pill"
          >
            {submitting ? 'Updating...' : 'Save Changes'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onclick={() => {
              status = 'draft';
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            class="btn-sm-pill btn-gray-sm"
            style="padding: 10px 18px;"
          >
            Unpublish
          </button>
        {/if}

        <a href="/" class="btn-sm-pill btn-gray-sm" style="padding: 10px 18px; margin-left: auto;">
          Cancel
        </a>
      </div>
    </form>
  </div>
{/if}
