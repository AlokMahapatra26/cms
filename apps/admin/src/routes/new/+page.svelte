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
    <a href="/" style="font-size: 13px; color: #707070; text-decoration: none;">&larr; Back to articles</a>
  </div>
  <h1 style="font-size: 32px; font-weight: 700; color: #141414; margin: 0; letter-spacing: -0.02em;">
    Create Article.
  </h1>
  <p style="color: #707070; font-size: 15px; margin: 4px 0 0 0;">
    Draft your post and deploy it to the edge.
  </p>
</div>

{#if error}
  <div style="background-color: #fff0f0; border: 1px solid #ffcdd2; border-radius: 16px; padding: 16px; color: #d32f2f; margin-bottom: 24px;">
    <strong>Error:</strong> {error}
  </div>
{/if}

<div class="form-card">
  <form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 24px;">
    <!-- Title -->
    <div>
      <label for="title" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 8px;">
        Title
      </label>
      <input
        id="title"
        type="text"
        class="input-field"
        bind:value={title}
        oninput={() => { if (!slug) autoSlug(); }}
        placeholder="Enter article title..."
        required
      />
    </div>

    <!-- Slug & Slugify -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <label for="slug" style="font-size: 13px; font-weight: 600; color: #141414;">
          Slug / URL Path
        </label>
        <button type="button" onclick={autoSlug} class="btn-pill-soft" style="font-size: 12px; padding: 4px 10px;">
          Generate from title
        </button>
      </div>
      <input
        id="slug"
        type="text"
        class="input-field"
        bind:value={slug}
        placeholder="article-slug"
        required
      />
    </div>

    <!-- Status (Segmented Control) -->
    <div>
      <div style="font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 8px;">
        Publishing Status
      </div>
      <div class="segmented-control">
        <button
          type="button"
          class="segment-item {status === 'draft' ? 'active' : ''}"
          onclick={() => (status = 'draft')}
        >
          Draft (Internal)
        </button>
        <button
          type="button"
          class="segment-item {status === 'published' ? 'active' : ''}"
          onclick={() => (status = 'published')}
        >
          Published (Public)
        </button>
      </div>
    </div>

    <!-- Cover Image (R2 Upload) -->
    <div>
      <div style="font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 8px;">
        Cover Image (Cloudflare R2)
      </div>
      {#if cover_image}
        <div style="background-color: #f3f3f3; border-radius: 16px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src={cover_image} alt="Cover Preview" class="squircle-thumb" style="width: 56px; height: 56px;" />
            <div>
              <div style="font-size: 13px; font-weight: 600; color: #141414;">Image uploaded to R2</div>
              <div style="font-size: 12px; color: #707070; word-break: break-all;">{cover_image}</div>
            </div>
          </div>
          <button type="button" onclick={() => { cover_image = ''; }} class="btn-danger-soft">
            Remove
          </button>
        </div>
      {:else}
        <div style="border: 2px dashed #e0e0e0; border-radius: 16px; padding: 24px; text-align: center; background-color: #fafafa;">
          <input
            id="cover"
            type="file"
            accept="image/*"
            onchange={handleFileUpload}
            style="display: none;"
          />
          <label for="cover" class="btn-outline" style="cursor: pointer;">
            {uploading ? 'Uploading to R2...' : 'Select Cover Image'}
          </label>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #707070;">
            PNG, JPG, WebP up to 10MB stored directly in Cloudflare R2 bucket
          </p>
        </div>
      {/if}
    </div>

    <!-- Excerpt -->
    <div>
      <label for="excerpt" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 8px;">
        Excerpt / Lead Paragraph
      </label>
      <textarea
        id="excerpt"
        class="input-field"
        bind:value={excerpt}
        rows="2"
        placeholder="A short summary of this article..."
      ></textarea>
    </div>

    <!-- Content (Markdown) -->
    <div>
      <label for="content" style="display: block; font-size: 13px; font-weight: 600; color: #141414; margin-bottom: 8px;">
        Article Content (Markdown)
      </label>
      <textarea
        id="content"
        class="input-field"
        bind:value={content}
        rows="16"
        placeholder="# Write your article in Markdown..."
        style="line-height: 1.6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;"
      ></textarea>
    </div>

    <!-- Action Buttons -->
    <div style="display: flex; gap: 12px; align-items: center; padding-top: 12px; border-top: 1px solid #f0f0f0; flex-wrap: wrap;">
      <button
        type="button"
        disabled={submitting}
        onclick={() => {
          status = 'published';
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        class="btn-primary"
        style="padding: 12px 28px; background-color: #0066ff;"
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
        class="btn-outline"
        style="padding: 11px 24px;"
      >
        {submitting && status === 'draft' ? 'Saving...' : 'Save as Draft'}
      </button>

      <a href="/" class="btn-pill-soft" style="padding: 11px 20px; color: #707070;">
        Cancel
      </a>
    </div>
  </form>
</div>
