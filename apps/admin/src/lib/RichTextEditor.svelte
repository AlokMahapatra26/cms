<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Image from '@tiptap/extension-image';
  import Link from '@tiptap/extension-link';
  import Placeholder from '@tiptap/extension-placeholder';
  import { uploadMedia } from '$lib/api';

  let {
    content = $bindable(''),
    placeholder = 'Start writing your article content here...'
  }: {
    content?: string;
    placeholder?: string;
  } = $props();

  let editorElement: HTMLDivElement | null = $state(null);
  let editor = $state<Editor | null>(null);
  let isUploadingImage = $state(false);
  let linkInputUrl = $state('');
  let showLinkModal = $state(false);

  // Active state trackers for toolbar buttons
  let isBold = $state(false);
  let isItalic = $state(false);
  let isStrike = $state(false);
  let isCode = $state(false);
  let isHeading1 = $state(false);
  let isHeading2 = $state(false);
  let isHeading3 = $state(false);
  let isBulletList = $state(false);
  let isOrderedList = $state(false);
  let isBlockquote = $state(false);
  let isCodeBlock = $state(false);
  let isLink = $state(false);

  function updateActiveStates() {
    if (!editor) return;
    isBold = editor.isActive('bold');
    isItalic = editor.isActive('italic');
    isStrike = editor.isActive('strike');
    isCode = editor.isActive('code');
    isHeading1 = editor.isActive('heading', { level: 1 });
    isHeading2 = editor.isActive('heading', { level: 2 });
    isHeading3 = editor.isActive('heading', { level: 3 });
    isBulletList = editor.isActive('bulletList');
    isOrderedList = editor.isActive('orderedList');
    isBlockquote = editor.isActive('blockquote');
    isCodeBlock = editor.isActive('codeBlock');
    isLink = editor.isActive('link');
  }

  onMount(() => {
    if (!editorElement) return;

    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3]
          }
        }),
        Image.configure({
          inline: false,
          allowBase64: true
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }),
        Placeholder.configure({
          placeholder
        })
      ],
      content: content || '',
      onUpdate: ({ editor: ed }) => {
        content = ed.getHTML();
        updateActiveStates();
      },
      onSelectionUpdate: () => {
        updateActiveStates();
      },
      onTransaction: () => {
        updateActiveStates();
      }
    });

    updateActiveStates();
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  // Keep editor content in sync when loaded asynchronously (e.g. in /edit/[id])
  $effect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      // Only set if meaningfully different to avoid cursor jumps
      if (Math.abs(editor.getHTML().length - content.length) > 2) {
        editor.commands.setContent(content, false);
      }
    }
  });

  // Direct R2 Media Upload & Embed
  async function handleImageUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0 || !editor) return;

    isUploadingImage = true;
    try {
      const res = await uploadMedia(target.files[0]);
      editor.chain().focus().setImage({ src: res.url, alt: target.files[0].name }).run();
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    } finally {
      isUploadingImage = false;
      target.value = '';
    }
  }

  function toggleLink() {
    if (!editor) return;
    if (isLink) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previousUrl = editor.getAttributes('link').href || '';
    linkInputUrl = previousUrl;
    showLinkModal = true;
  }

  function applyLink() {
    if (!editor) return;
    if (!linkInputUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      let finalUrl = linkInputUrl.trim();
      if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('/')) {
        finalUrl = 'https://' + finalUrl;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    showLinkModal = false;
    linkInputUrl = '';
  }
</script>

<div class="rich-editor-wrapper">
  <!-- Toolbar -->
  <div class="rich-toolbar">
    <!-- Text styling -->
    <button
      type="button"
      class="toolbar-btn {isBold ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleBold().run()}
      title="Bold (Ctrl+B)"
    >
      <strong>B</strong>
    </button>
    <button
      type="button"
      class="toolbar-btn {isItalic ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleItalic().run()}
      title="Italic (Ctrl+I)"
    >
      <em>I</em>
    </button>
    <button
      type="button"
      class="toolbar-btn {isStrike ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleStrike().run()}
      title="Strikethrough"
    >
      <s>S</s>
    </button>
    <button
      type="button"
      class="toolbar-btn {isCode ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleCode().run()}
      title="Inline Code"
    >
      <code>&lt;/&gt;</code>
    </button>

    <span class="toolbar-divider"></span>

    <!-- Headings -->
    <button
      type="button"
      class="toolbar-btn {isHeading1 ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
      title="Heading 1"
    >
      H1
    </button>
    <button
      type="button"
      class="toolbar-btn {isHeading2 ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      title="Heading 2"
    >
      H2
    </button>
    <button
      type="button"
      class="toolbar-btn {isHeading3 ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
      title="Heading 3"
    >
      H3
    </button>

    <span class="toolbar-divider"></span>

    <!-- Lists & Quotes -->
    <button
      type="button"
      class="toolbar-btn {isBulletList ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleBulletList().run()}
      title="Bullet List"
    >
      • List
    </button>
    <button
      type="button"
      class="toolbar-btn {isOrderedList ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleOrderedList().run()}
      title="Numbered List"
    >
      1. List
    </button>
    <button
      type="button"
      class="toolbar-btn {isBlockquote ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleBlockquote().run()}
      title="Quote"
    >
      &ldquo; Quote
    </button>
    <button
      type="button"
      class="toolbar-btn {isCodeBlock ? 'active' : ''}"
      onclick={() => editor?.chain().focus().toggleCodeBlock().run()}
      title="Code Block"
    >
      Block
    </button>

    <span class="toolbar-divider"></span>

    <!-- Link -->
    <button
      type="button"
      class="toolbar-btn {isLink ? 'active' : ''}"
      onclick={toggleLink}
      title="Add/Edit Link"
    >
      🔗 Link
    </button>

    <!-- Insert Image to R2 -->
    <label class="toolbar-btn" style="cursor: pointer;" title="Upload & Insert Image from R2">
      <span>{isUploadingImage ? 'Uploading...' : '🖼️ Image'}</span>
      <input
        type="file"
        accept="image/*"
        onchange={handleImageUpload}
        disabled={isUploadingImage}
        style="display: none;"
      />
    </label>

    <button
      type="button"
      class="toolbar-btn"
      onclick={() => editor?.chain().focus().setHorizontalRule().run()}
      title="Horizontal Divider"
    >
      &minus; Divider
    </button>

    <span class="toolbar-divider"></span>

    <!-- Undo / Redo -->
    <button
      type="button"
      class="toolbar-btn"
      onclick={() => editor?.chain().focus().undo().run()}
      title="Undo (Ctrl+Z)"
    >
      ↶
    </button>
    <button
      type="button"
      class="toolbar-btn"
      onclick={() => editor?.chain().focus().redo().run()}
      title="Redo (Ctrl+Y)"
    >
      ↷
    </button>
  </div>

  <!-- Link Popup -->
  {#if showLinkModal}
    <div class="link-modal-bar">
      <input
        type="url"
        bind:value={linkInputUrl}
        placeholder="https://example.com"
        class="shopify-input"
        style="padding: 4px 8px; font-size: 12px; height: 28px;"
        onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
      />
      <button type="button" class="btn-sm-pill btn-aloe-sm" onclick={applyLink}>
        Apply
      </button>
      <button type="button" class="btn-sm-pill btn-gray-sm" onclick={() => { showLinkModal = false; }}>
        Cancel
      </button>
    </div>
  {/if}

  <!-- Editor Editable Content Surface -->
  <div bind:this={editorElement} class="rich-content-surface"></div>
</div>

<style>
  .rich-editor-wrapper {
    background-color: #ffffff;
    border: 1px solid #d4d4d8;
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .rich-editor-wrapper:focus-within {
    border-color: #000000;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08);
  }

  /* Toolbar */
  .rich-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 3px;
    padding: 6px 8px;
    background-color: #fbfbf5;
    border-bottom: 1px solid #e4e4e7;
    user-select: none;
  }

  .toolbar-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 500;
    color: #3f3f46;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1.2;
    transition: all 0.1s ease;
  }

  .toolbar-btn:hover {
    background-color: #f4f4f5;
    color: #000000;
  }

  .toolbar-btn.active {
    background-color: #000000;
    color: #ffffff;
    border-color: #000000;
  }

  .toolbar-divider {
    display: inline-block;
    width: 1px;
    height: 16px;
    background-color: #e4e4e7;
    margin: 0 4px;
  }

  .link-modal-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background-color: #fafafa;
    border-bottom: 1px solid #e4e4e7;
  }

  /* Content Surface */
  .rich-content-surface {
    padding: 14px 16px;
    min-height: 280px;
    outline: none;
    font-size: 14px;
    line-height: 1.6;
    color: #18181b;
  }

  /* Tiptap Internal Prose Styles */
  :global(.rich-content-surface .tiptap) {
    outline: none;
    min-height: 260px;
  }

  :global(.rich-content-surface p) {
    margin: 0 0 10px 0;
  }

  :global(.rich-content-surface p.is-editor-empty:first-child::before) {
    color: #a1a1aa;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  :global(.rich-content-surface h1) {
    font-size: 22px;
    font-weight: 700;
    margin: 18px 0 8px 0;
    color: #000000;
    line-height: 1.25;
  }

  :global(.rich-content-surface h2) {
    font-size: 18px;
    font-weight: 600;
    margin: 16px 0 6px 0;
    color: #000000;
    line-height: 1.3;
  }

  :global(.rich-content-surface h3) {
    font-size: 15px;
    font-weight: 600;
    margin: 14px 0 4px 0;
    color: #000000;
    line-height: 1.35;
  }

  :global(.rich-content-surface ul),
  :global(.rich-content-surface ol) {
    padding-left: 24px;
    margin: 0 0 10px 0;
  }

  :global(.rich-content-surface li) {
    margin-bottom: 4px;
  }

  :global(.rich-content-surface blockquote) {
    border-left: 3px solid #c1fbd4;
    padding-left: 14px;
    margin: 12px 0;
    color: #52525b;
    font-style: italic;
    background-color: #fbfbf5;
    padding-top: 6px;
    padding-bottom: 6px;
    border-radius: 0 6px 6px 0;
  }

  :global(.rich-content-surface code) {
    background-color: #f4f4f5;
    color: #09090b;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12.5px;
  }

  :global(.rich-content-surface pre) {
    background-color: #18181b;
    color: #f4f4f5;
    padding: 14px;
    border-radius: 8px;
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12.5px;
    line-height: 1.5;
    margin: 12px 0;
  }

  :global(.rich-content-surface pre code) {
    background: transparent;
    color: inherit;
    padding: 0;
  }

  :global(.rich-content-surface img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 12px 0;
    display: block;
    border: 1px solid #e4e4e7;
  }

  :global(.rich-content-surface hr) {
    border: none;
    border-top: 1px solid #e4e4e7;
    margin: 18px 0;
  }

  :global(.rich-content-surface a) {
    color: #000000;
    text-decoration: underline;
    text-underline-offset: 3px;
    font-weight: 500;
  }
</style>

