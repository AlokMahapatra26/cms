<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Image from '@tiptap/extension-image';
  import Link from '@tiptap/extension-link';
  import Placeholder from '@tiptap/extension-placeholder';
  import { uploadMedia } from '$lib/api';
  import { modal } from '$lib/modal.svelte';
  import { Icon } from '$lib/components';

  let {
    content = $bindable(''),
    placeholder = 'Start writing your rich content here...'
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
      await modal.alert({
        title: 'Image Upload Failed',
        message: err.message || 'Failed to upload image to Cloudflare R2',
        variant: 'danger'
      });
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
      <Icon name="link" size={13} />
      <span>Link</span>
    </button>

    <!-- Insert Image to R2 -->
    <label class="toolbar-btn cursor-pointer" title="Upload & Insert Image from R2">
      {#if isUploadingImage}
        <span>Uploading...</span>
      {:else}
        <Icon name="media" size={13} />
        <span>Image</span>
      {/if}
      <input
        type="file"
        accept="image/*"
        onchange={handleImageUpload}
        disabled={isUploadingImage}
        class="hidden"
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
        class="shopify-input shopify-input-compact"
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



