<script lang="ts">
  let {
    title = '',
    slug = '',
    excerpt = '',
    cover_image = '',
    meta_title = $bindable(''),
    meta_description = $bindable(''),
    og_image = $bindable(''),
    canonical_url = $bindable('')
  }: {
    title: string;
    slug: string;
    excerpt: string;
    cover_image: string;
    meta_title: string;
    meta_description: string;
    og_image: string;
    canonical_url: string;
  } = $props();

  let previewMode = $state<'google' | 'twitter' | 'social'>('google');
  let isExpanded = $state(false);

  // Derived effective values for live preview
  const displayTitle = $derived(meta_title.trim() || title.trim() || 'Article Title');
  const displayDescription = $derived(
    meta_description.trim() ||
    excerpt.trim() ||
    'Read this post on our edge-native storefront running on Cloudflare Workers and D1.'
  );
  const displayImage = $derived(og_image.trim() || cover_image.trim() || '');
  const displaySlug = $derived(slug.trim() || 'article-slug');

  // Character counters
  const titleCount = $derived(meta_title.length);
  const descCount = $derived(meta_description.length);
</script>

<div class="shopify-card seo-card">
  <!-- Card Header / Collapsible Toggle -->
  <button
    type="button"
    class="seo-header-btn"
    onclick={() => (isExpanded = !isExpanded)}
    aria-expanded={isExpanded}
  >
    <div style="display: flex; align-items: center; gap: 10px;">
      <div class="seo-icon-pill">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      </div>
      <div style="text-align: left;">
        <div style="font-size: 13.5px; font-weight: 600; color: #000000; line-height: 1.2;">
          Search Engine & Social Media Preview (SEO)
        </div>
        <div style="font-size: 11.5px; color: #71717a; margin-top: 2px;">
          Customize how this article looks on Google, Twitter / X, and social shares
        </div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 10px;">
      <span class="seo-status-pill">
        {meta_title || meta_description ? 'Customized' : 'Auto-synced'}
      </span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="transition: transform 0.2s ease; transform: {isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}; color: #71717a;"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  </button>

  {#if isExpanded}
    <div class="seo-body">
      <!-- Input Controls Section -->
      <div class="seo-inputs-grid">
        <!-- Meta Title -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label for="meta-title" class="seo-label">
              Search Meta Title
            </label>
            <span class="char-count {titleCount > 60 ? 'warn' : ''}">
              {titleCount}/60
            </span>
          </div>
          <input
            id="meta-title"
            type="text"
            class="shopify-input"
            bind:value={meta_title}
            placeholder={title || 'Defaults to article title...'}
          />
          <div class="field-hint">
            Recommended length: 50–60 characters. Search engines will truncate longer titles.
          </div>
        </div>

        <!-- Meta Description -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label for="meta-desc" class="seo-label">
              Search Meta Description
            </label>
            <span class="char-count {descCount > 160 ? 'warn' : ''}">
              {descCount}/160
            </span>
          </div>
          <textarea
            id="meta-desc"
            class="shopify-input"
            rows="2"
            bind:value={meta_description}
            placeholder={excerpt || 'Defaults to post excerpt or opening paragraph...'}
          ></textarea>
          <div class="field-hint">
            Recommended length: 120–160 characters. Appears as the snippet beneath your title in Google results.
          </div>
        </div>

        <!-- OG Image & Canonical -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
          <div>
            <label for="og-image" class="seo-label" style="margin-bottom: 6px; display: block;">
              Social Share Image (OG Image)
            </label>
            <input
              id="og-image"
              type="text"
              class="shopify-input"
              bind:value={og_image}
              placeholder={cover_image || 'Defaults to featured cover image...'}
            />
          </div>

          <div>
            <label for="canonical" class="seo-label" style="margin-bottom: 6px; display: block;">
              Canonical URL (Optional)
            </label>
            <input
              id="canonical"
              type="url"
              class="shopify-input"
              bind:value={canonical_url}
              placeholder="e.g. https://yourdomain.com/posts/..."
            />
          </div>
        </div>
      </div>

      <!-- Live Preview Section -->
      <div class="seo-preview-section">
        <div class="seo-preview-header">
          <span style="font-size: 12px; font-weight: 600; color: #000000; text-transform: uppercase; letter-spacing: 0.04em;">
            Live SERP & Social Card Preview
          </span>

          <!-- Preview Mode Segmented Tabs -->
          <div class="shopify-segmented preview-tabs">
            <button
              type="button"
              class="shopify-segment-btn {previewMode === 'google' ? 'active' : ''}"
              onclick={() => (previewMode = 'google')}
            >
              Google Search
            </button>
            <button
              type="button"
              class="shopify-segment-btn {previewMode === 'twitter' ? 'active' : ''}"
              onclick={() => (previewMode = 'twitter')}
            >
              Twitter / X
            </button>
            <button
              type="button"
              class="shopify-segment-btn {previewMode === 'social' ? 'active' : ''}"
              onclick={() => (previewMode = 'social')}
            >
              Social Post
            </button>
          </div>
        </div>

        <!-- Google SERP Card -->
        {#if previewMode === 'google'}
          <div class="google-card">
            <div class="google-citation">
              <div class="google-favicon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                </svg>
              </div>
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 12px; color: #202124; font-weight: 500; line-height: 1.2;">EdgeBlog</span>
                <span style="font-size: 11px; color: #4d5156; line-height: 1.2;">https://example.com › posts › {displaySlug}</span>
              </div>
            </div>

            <div class="google-title">
              {displayTitle}
            </div>

            <div class="google-snippet">
              <span style="color: #70757a; font-weight: 400; margin-right: 4px;">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} —
              </span>
              {displayDescription}
            </div>
          </div>

        <!-- Twitter / X Large Summary Card -->
        {:else if previewMode === 'twitter'}
          <div class="twitter-card">
            <div class="twitter-image-container">
              {#if displayImage}
                <img
                  src={displayImage}
                  alt="Social share preview"
                  class="twitter-image"
                  onerror={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              {:else}
                <div class="image-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>1200 x 630 Recommended Social Banner</span>
                </div>
              {/if}
            </div>

            <div class="twitter-content">
              <div class="twitter-domain">example.com</div>
              <div class="twitter-title">{displayTitle}</div>
              <div class="twitter-snippet">{displayDescription}</div>
            </div>
          </div>

        <!-- Facebook / LinkedIn Share Preview -->
        {:else}
          <div class="facebook-card">
            <div class="facebook-image-container">
              {#if displayImage}
                <img
                  src={displayImage}
                  alt="Social preview"
                  class="facebook-image"
                  onerror={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              {:else}
                <div class="image-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>OpenGraph Image (1200 x 630)</span>
                </div>
              {/if}
            </div>

            <div class="facebook-content">
              <div class="facebook-domain">EXAMPLE.COM</div>
              <div class="facebook-title">{displayTitle}</div>
              <div class="facebook-snippet">{displayDescription}</div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>



