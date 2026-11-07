<script lang="ts">
  interface Props {
    name: string;
    size?: number;
    class?: string;
  }

  let {
    name,
    size = 16,
    class: customClass = ''
  }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 20 20"
  fill="currentColor"
  class="polaris-icon {customClass}"
  aria-hidden="true"
>
  {#if name === 'schema' || name === 'modeler'}
    <!-- Polaris Component / Layout Grid -->
    <path fill-rule="evenodd" d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-11Zm2 2.5v7.5h10V7H5Zm0-2h10V4.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5V5Z" clip-rule="evenodd" />
  {:else if name === 'media' || name === 'image'}
    <!-- Polaris Image / Media Asset -->
    <path fill-rule="evenodd" d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-11ZM4.5 4a.5.5 0 0 0-.5.5v7.793l3.146-3.147a.5.5 0 0 1 .708 0l2.5 2.5 3.146-3.146a.5.5 0 0 1 .708 0L16 10.793V4.5a.5.5 0 0 0-.5-.5h-11ZM7 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clip-rule="evenodd" />
  {:else if name === 'api' || name === 'code'}
    <!-- Polaris Code / Curly Braces -->
    <path fill-rule="evenodd" d="M7.707 5.293a1 1 0 0 1 0 1.414L4.414 10l3.293 3.293a1 1 0 1 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414l4-4a1 1 0 0 1 1.414 0Zm4.586 0a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414-1.414L15.586 10l-3.293-3.293a1 1 0 0 1 0-1.414Z" clip-rule="evenodd" />
  {:else if name === 'settings' || name === 'cog'}
    <!-- Polaris Settings Wheel -->
    <path fill-rule="evenodd" d="M8.337 2.118a1.5 1.5 0 0 1 3.326 0l.214.86a1 1 0 0 0 .97.753l.884-.047a1.5 1.5 0 0 1 2.352 2.352l-.047.884a1 1 0 0 0 .753.97l.86.214a1.5 1.5 0 0 1 0 3.326l-.86.214a1 1 0 0 0-.753.97l.047.884a1.5 1.5 0 0 1-2.352 2.352l-.884-.047a1 1 0 0 0-.97.753l-.214.86a1.5 1.5 0 0 1-3.326 0l-.214-.86a1 1 0 0 0-.97-.753l-.884.047a1.5 1.5 0 0 1-2.352-2.352l.047-.884a1 1 0 0 0-.753-.97l-.86-.214a1.5 1.5 0 0 1 0-3.326l.86-.214a1 1 0 0 0 .753-.97l-.047-.884a1.5 1.5 0 0 1 2.352-2.352l.884.047a1 1 0 0 0 .97-.753l.214-.86ZM10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" clip-rule="evenodd" />
  {:else if name === 'text'}
    <!-- Text / Typography T -->
    <path fill-rule="evenodd" d="M3.5 4a1 1 0 0 1 1-1h11a1 1 0 1 1 0 2H11v11a1 1 0 1 1-2 0V5H4.5a1 1 0 0 1-1-1Z" clip-rule="evenodd" />
  {:else if name === 'longtext'}
    <!-- Long Text / Paragraph Lines -->
    <path fill-rule="evenodd" d="M3 4.5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 4.5Zm0 4a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 8.5Zm0 4a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75Zm0 4a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" />
  {:else if name === 'richtext'}
    <!-- Rich Text / Format Quill -->
    <path fill-rule="evenodd" d="M4 3.75A.75.75 0 0 1 4.75 3h10.5a.75.75 0 0 1 0 1.5H11v4h3.25a.75.75 0 0 1 0 1.5H11v6.25a.75.75 0 0 1-1.5 0V10H6.25a.75.75 0 0 1 0-1.5H9.5V4.5H4.75A.75.75 0 0 1 4 3.75Zm11.22 8.03a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-.53.22H11.5a.75.75 0 0 1-.75-.75v-2.25c0-.2.08-.39.22-.53l4.25-4.25Zm.53 1.59L12.25 16.88v1.12h1.12l3.5-3.5-1.12-1.12Z" clip-rule="evenodd" />
  {:else if name === 'number'}
    <!-- Number / Hash Symbol -->
    <path fill-rule="evenodd" d="M7.4 3a.75.75 0 0 1 .74.63l.41 2.87h3.04l.41-2.87a.75.75 0 1 1 1.48.22l-.38 2.65h2.15a.75.75 0 0 1 0 1.5h-2.36l-.58 4h2.19a.75.75 0 0 1 0 1.5h-2.4l-.38 2.65a.75.75 0 0 1-1.48-.22l.41-2.93H8.35l-.41 2.93a.75.75 0 0 1-1.48-.22l.38-2.71H4.75a.75.75 0 0 1 0-1.5h2.2l.58-4H5.25a.75.75 0 0 1 0-1.5h2.42l.38-2.65A.75.75 0 0 1 7.4 3Zm1.38 5-.58 4h3.04l.58-4H8.78Z" clip-rule="evenodd" />
  {:else if name === 'boolean'}
    <!-- Boolean Toggle -->
    <path fill-rule="evenodd" d="M6.5 5A4.5 4.5 0 0 0 2 9.5c0 2.485 2.015 4.5 4.5 4.5h7a4.5 4.5 0 0 0 0-9h-7ZM5 9.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm8.5-3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" clip-rule="evenodd" />
  {:else if name === 'date'}
    <!-- Date / Calendar -->
    <path fill-rule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h1.5A2.25 2.25 0 0 1 18.75 6.25v9.5A2.25 2.25 0 0 1 16.5 18H3.5A2.25 2.25 0 0 1 1.25 15.75v-9.5A2.25 2.25 0 0 1 3.5 4H5V2.75A.75.75 0 0 1 5.75 2ZM2.75 8v7.75c0 .414.336.75.75.75h13a.75.75 0 0 0 .75-.75V8h-14.5ZM16.5 5.5H3.5a.75.75 0 0 0-.75.75V6.5h14.5v-.25a.75.75 0 0 0-.75-.75Z" clip-rule="evenodd" />
  {:else if name === 'select'}
    <!-- Select Dropdown List -->
    <path fill-rule="evenodd" d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-11Zm2.5.5a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 0-1.5h-9Zm0 4a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Zm0 4a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4Z" clip-rule="evenodd" />
  {:else if name === 'link'}
    <!-- Chain Link -->
    <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 1 1 2.828 2.828l-2.5 2.5a2 2 0 0 1-2.828-2.828l.586-.586a.75.75 0 0 0-1.06-1.06l-.586.585a3.5 3.5 0 1 0 4.95 4.95l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-.586.586a.75.75 0 0 0 1.06 1.06l.586-.585Zm-5.172 6.242a2 2 0 1 1-2.828-2.828l2.5-2.5a2 2 0 0 1 2.828 2.828l-.586.586a.75.75 0 0 0 1.06 1.06l.586-.585a3.5 3.5 0 1 0-4.95-4.95l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l.586-.586a.75.75 0 0 0-1.06-1.06l-.586.585Z" clip-rule="evenodd" />
  {:else if name === 'trash'}
    <!-- Trash Can -->
    <path fill-rule="evenodd" d="M8.75 3a.75.75 0 0 0-.75.75V4.5H5.25a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5H12V3.75A.75.75 0 0 0 11.25 3h-2.5ZM6.5 7.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm3.5 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm3.5 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75ZM4.5 6.75A.75.75 0 0 1 5.25 6h9.5a.75.75 0 0 1 .75.75v8.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-8.5Z" clip-rule="evenodd" />
  {:else if name === 'edit'}
    <!-- Pencil / Edit -->
    <path fill-rule="evenodd" d="M15.22 3.22a2.5 2.5 0 0 1 3.54 3.54l-9.5 9.5a1.5 1.5 0 0 1-.68.4l-4 1a.75.75 0 0 1-.9-.9l1-4a1.5 1.5 0 0 1 .4-.68l9.5-9.5Zm2.48 2.48a1 1 0 0 0-1.41-1.41L15 5.58 16.41 7l1.29-1.3ZM15.35 8.06 13.94 6.65 6.13 14.46a.5.5 0 0 0-.13.23l-.62 2.48 2.48-.62a.5.5 0 0 0 .23-.13l7.26-7.36Z" clip-rule="evenodd" />
  {:else if name === 'plus'}
    <!-- Plus + -->
    <path fill-rule="evenodd" d="M10 4.25a.75.75 0 0 1 .75.75v4.25H15a.75.75 0 0 1 0 1.5h-4.25V15a.75.75 0 0 1-1.5 0v-4.25H5a.75.75 0 0 1 0-1.5h4.25V5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
  {:else if name === 'check'}
    <!-- Checkmark -->
    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z" clip-rule="evenodd" />
  {:else if name === 'close'}
    <!-- Cross -->
    <path fill-rule="evenodd" d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
  {:else if name === 'lock'}
    <!-- Padlock -->
    <path fill-rule="evenodd" d="M10 2a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4Zm-2.5 6V6a2.5 2.5 0 0 1 5 0v2h-5ZM10 12a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 10 12Z" clip-rule="evenodd" />
  {:else if name === 'external'}
    <!-- Arrow up-right ↗ -->
    <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0L12 9.06V13a.75.75 0 0 0 1.5 0V7.25a.75.75 0 0 0-.75-.75H7a.75.75 0 0 0 0 1.5h3.94l-5.72 5.72a.75.75 0 0 0 0 1.06Z" clip-rule="evenodd" />
  {:else if name === 'collection'}
    <!-- Collection Box -->
    <path fill-rule="evenodd" d="M3.75 3A1.75 1.75 0 0 0 2 4.75v10.5C2 16.216 2.784 17 3.75 17h12.5A1.75 1.75 0 0 0 18 15.25V4.75A1.75 1.75 0 0 0 16.25 3H3.75ZM3.5 4.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v2.5H3.5v-2.5Zm0 4h13v6.5a.25.25 0 0 1-.25.25H3.75a.25.25 0 0 1-.25-.25v-6.5Z" clip-rule="evenodd" />
  {:else if name === 'upload'}
    <!-- Upload to Storage Tray -->
    <path fill-rule="evenodd" d="M9.47 3.22a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 1 1-1.06 1.06L10.75 5.56V12a.75.75 0 0 1-1.5 0V5.56L7.03 7.78a.75.75 0 0 1-1.06-1.06l3.5-3.5ZM3 13.5a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5H4.5v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1.5h-1.25a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 .75.75v2.25A2 2 0 0 1 15 17H5a2 2 0 0 1-2-2v-2.25Z" clip-rule="evenodd" />
  {:else if name === 'globe' || name === 'seo'}
    <!-- Globe / Web SEO -->
    <path fill-rule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-6.47 7.25h3.04a13.3 13.3 0 0 1 .63-4.63A6.52 6.52 0 0 0 3.53 9.25Zm0 1.5a6.52 6.52 0 0 0 3.67 4.63 13.3 13.3 0 0 1-.63-4.63H3.53Zm5.04 0h2.86a11.9 11.9 0 0 1-.77 4.41c-.2.4-.42.75-.66.97a1 1 0 0 1-.005 0c-.24-.22-.46-.57-.66-.97a11.9 11.9 0 0 1-.76-4.41Zm0-1.5c.1-.88.27-1.8.52-2.6.24-.76.54-1.38.91-1.65.37.27.67.89.91 1.65.25.8.42 1.72.52 2.6H8.57Zm4.23-1.5a13.3 13.3 0 0 1 .63 4.63h3.04a6.52 6.52 0 0 0-3.67-4.63Zm.63 6.13c-.15 1.7-.55 3.1-1.09 4.13a6.52 6.52 0 0 0 3.73-4.13h-2.64Z" clip-rule="evenodd" />
  {:else if name === 'arrow-left' || name === 'back'}
    <!-- Arrow Left / Back -->
    <path fill-rule="evenodd" d="M10.78 4.22a.75.75 0 0 1 0 1.06L6.56 9.5H16.25a.75.75 0 0 1 0 1.5H6.56l4.22 4.22a.75.75 0 1 1-1.06 1.06l-5.5-5.5a.75.75 0 0 1 0-1.06l5.5-5.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
  {:else if name === 'chevron-down'}
    <!-- Chevron Down -->
    <path fill-rule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
  {:else if name === 'chevron-up'}
    <!-- Chevron Up -->
    <path fill-rule="evenodd" d="M9.47 7.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1-1.06 1.06L10 8.81l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd" />
  {:else if name === 'chevron-left'}
    <!-- Chevron Left -->
    <path fill-rule="evenodd" d="M12.78 5.22a.75.75 0 0 1 0 1.06L9.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
  {:else if name === 'chevron-right'}
    <!-- Chevron Right -->
    <path fill-rule="evenodd" d="M7.22 14.78a.75.75 0 0 1 0-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z" clip-rule="evenodd" />
  {:else if name === 'search'}
    <!-- Search / Magnifying Glass -->
    <path fill-rule="evenodd" d="M8.5 3a5.5 5.5 0 0 1 4.227 9.02l4.126 4.127a.75.75 0 0 1-1.06 1.06l-4.127-4.126A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" clip-rule="evenodd" />
  {:else if name === 'sort'}
    <!-- Sort Carets Up-Down -->
    <path fill-rule="evenodd" d="M9.47 3.22a.75.75 0 0 1 1.06 0l3 3a.75.75 0 1 1-1.06 1.06L10 4.81 7.53 7.28a.75.75 0 0 1-1.06-1.06l3-3Zm-2.47 10.5a.75.75 0 0 1 1.06 0L10 15.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
  {:else if name === 'warning' || name === 'danger'}
    <!-- Warning Alert Triangle -->
    <path fill-rule="evenodd" d="M8.59 2.87a1.65 1.65 0 0 1 2.82 0l6.98 12.08A1.65 1.65 0 0 1 16.98 17H3.02a1.65 1.65 0 0 1-1.41-2.05L8.59 2.87ZM10 6.5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 10 6.5Zm0 7a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z" clip-rule="evenodd" />
  {:else if name === 'info'}
    <!-- Information Circle -->
    <path fill-rule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.75 4.5a.75.75 0 0 1 1.5 0v.5a.75.75 0 0 1-1.5 0V6.5Zm0 3.25a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0v-4.5Z" clip-rule="evenodd" />
  {:else}
    <!-- Generic Dot Glyph -->
    <circle cx="10" cy="10" r="4" />
  {/if}
</svg>
