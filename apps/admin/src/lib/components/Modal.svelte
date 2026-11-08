<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  interface Props {
    open: boolean;
    title?: string;
    icon?: 'danger' | 'warning' | 'primary' | 'info' | 'none';
    maxWidth?: string;
    onclose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  }

  let {
    open = false,
    title = '',
    icon = 'none',
    maxWidth = '460px',
    onclose,
    children,
    footer
  }: Props = $props();

  function onKeyDown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onclose?.();
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    role="presentation"
  >
    <div
      class="modal-dialog"
      style="max-width: {maxWidth};"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="modal-header">
        <div class="flex items-center gap-2">
          {#if icon === 'danger'}
            <div class="modal-icon-badge danger">
              <Icon name="danger" size={16} />
            </div>
          {:else if icon === 'warning'}
            <div class="modal-icon-badge warning">
              <Icon name="warning" size={16} />
            </div>
          {:else if icon === 'primary'}
            <div class="modal-icon-badge primary">
              <Icon name="check" size={16} />
            </div>
          {:else if icon === 'info'}
            <div class="modal-icon-badge info">
              <Icon name="info" size={16} />
            </div>
          {/if}

          {#if title}
            <h3 class="modal-title">{title}</h3>
          {/if}
        </div>

        {#if onclose}
          <button
            type="button"
            class="modal-close-btn"
            onclick={onclose}
            aria-label="Close modal"
          >
            <Icon name="close" size={14} />
          </button>
        {/if}
      </div>

      <!-- Body -->
      <div class="modal-body">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <!-- Footer -->
      {#if footer}
        <div class="modal-footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

