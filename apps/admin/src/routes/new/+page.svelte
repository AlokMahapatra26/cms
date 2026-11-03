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
      error = err.message || 'Failed to create article';
    } finally {
      submitting = false;
    }
  }
</script>

<div style="margin-bottom: 24px;">
  <div style="margin-bottom: 8px;">
    <a href="/" style="font-size: 13px; color: #71717a; text-decoration: none;">&larr; Back to articles</a>
  </div>
  <h1 style="font-size: 32px; font-weight: 400; color: #000000; margin: 0; letter-spacing: -0.01em;">
    Create Article
  </h1>
  <p style="color: #71717a; font-size: 14px; margin: 4px 0 0 0;">
    Draft content and publish to your edge-native storefront.
  </p>
</div>

{#if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 16px; color: #b91c1c; margin-bottom: 24px;">
    <strong>Error:</strong> {error}
  </div>
{/if}

<div class="shopify-card" style="padding: 32px;">
  <form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 24px;">
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
        oninput={() => { if (!slug) autoSlug(); }}
        placeholder="e.g. New Summer Collection Release"
        required
      />
    </div>

    <!-- Slug & Slugify -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <label for="slug" style="font-size: 13px; font-weight: 600; color: #000000;">
          Slug / URL Handle
        </label>
        <button type="button" onclick={autoSlug} class="btn-sm-pill btn-gray-sm" style="font-size: 12px;">
          Generate from title
        </button>
      </div>
      <input
        id="slug"
        type="text"
        class="shopify-input"
        bind:value={slug}
        placeholder="article-url-handle"
        required
      />
    </div>

    <!-- Status -->
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
              <div style="font-size: 13px; font-weight: 600; color: #000000;">Uploaded to R2 Bucket</div>
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
        placeholder="Brief summary for storefront and search engine listings..."
      ></textarea>
    </div>

    <!-- Content -->
    <div>
      <label for="content" style="display: block; font-size: 13px; font-weight: 600; color: #000000; margin-bottom: 8px;">
        Article Content (Markdown)
      </label>
      <textarea
        id="content"
        class="shopify-input"
        bind:value={content}
        rows="16"
        placeholder="# Write your article in Markdown..."
        style="line-height: 1.6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;"
      ></textarea>
    </div>

    <!-- Actions -->
    <div style="display: flex; gap: 12px; align-items: center; padding-top: 14px; border-top: 1px solid #e4e4e7; flex-wrap: wrap;">
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
        {submitting && status === 'published' ? 'Publishing...' : 'Publish Article'}
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
        {submitting && status === 'draft' ? 'Saving...' : 'Save as Draft'}
      </button>

      <a href="/" class="btn-sm-pill btn-gray-sm" style="padding: 10px 18px; margin-left: auto;">
        Cancel
      </a>
    </div>
  </form>
</div>
