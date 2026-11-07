<script lang="ts">
  import { modal } from '$lib/modal.svelte';

  function onKeyDown(e: KeyboardEvent) {
    if (!modal.isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      modal.handleCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      modal.handleConfirm();
    }
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      modal.handleCancel();
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

{#if modal.isOpen}
  <!-- Modal Overlay -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    onclick={onBackdropClick}
    role="presentation"
  >
    <div
      class="modal-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <!-- Header with Icon & Close -->
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          {#if modal.variant === 'danger'}
            <div class="modal-icon-badge danger">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
          {:else if modal.variant === 'warning'}
            <div class="modal-icon-badge warning">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
          {:else if modal.variant === 'primary'}
            <div class="modal-icon-badge primary">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          {:else}
            <div class="modal-icon-badge info">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
          {/if}

          <h3 id="modal-title" class="modal-title">{modal.title}</h3>
        </div>

        <button
          type="button"
          class="modal-close-btn"
          onclick={() => modal.handleCancel()}
          title="Close dialog (Esc)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Message Content -->
      <div class="modal-body">
        <p class="modal-message">{modal.message}</p>
      </div>

      <!-- Footer Buttons -->
      <div class="modal-footer">
        {#if !modal.isAlert}
          <button
            type="button"
            class="btn-outline-pill modal-btn"
            onclick={() => modal.handleCancel()}
          >
            {modal.cancelText}
          </button>
        {/if}

        {#if modal.variant === 'danger'}
          <button
            type="button"
            class="btn-danger-pill"
            style="font-size: 12.5px; padding: 6px 16px;"
            onclick={() => modal.handleConfirm()}
          >
            {modal.confirmText}
          </button>
        {:else}
          <button
            type="button"
            class="btn-primary-pill"
            style="font-size: 12.5px; padding: 6px 16px;"
            onclick={() => modal.handleConfirm()}
          >
            {modal.confirmText}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
