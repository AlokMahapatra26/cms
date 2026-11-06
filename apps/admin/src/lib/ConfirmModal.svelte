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
            class="modal-btn-danger"
            onclick={() => modal.handleConfirm()}
          >
            {modal.confirmText}
          </button>
        {:else}
          <button
            type="button"
            class="btn-primary-pill modal-btn"
            onclick={() => modal.handleConfirm()}
          >
            {modal.confirmText}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-dialog {
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    border: 1px solid #e4e4e7;
    width: 100%;
    max-width: 440px;
    overflow: hidden;
    animation: popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 18px;
    border-bottom: 1px solid #f4f4f5;
  }

  .modal-title {
    font-size: 14.5px;
    font-weight: 600;
    color: #000000;
    margin: 0;
    line-height: 1.3;
  }

  .modal-close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #71717a;
    padding: 4px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.1s ease;
  }

  .modal-close-btn:hover {
    background-color: #f4f4f5;
    color: #000000;
  }

  .modal-icon-badge {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .modal-icon-badge.danger {
    background-color: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .modal-icon-badge.warning {
    background-color: #fffbeb;
    color: #d97706;
    border: 1px solid #fde68a;
  }

  .modal-icon-badge.primary {
    background-color: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  .modal-icon-badge.info {
    background-color: #f4f4f5;
    color: #18181b;
    border: 1px solid #e4e4e7;
  }

  .modal-body {
    padding: 16px 18px;
  }

  .modal-message {
    font-size: 13.5px;
    color: #52525b;
    line-height: 1.5;
    margin: 0;
    word-break: break-word;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 18px;
    background-color: #fbfbf5;
    border-top: 1px solid #e4e4e7;
  }

  .modal-btn {
    font-size: 12.5px;
    padding: 6px 15px;
  }

  .modal-btn-danger {
    background-color: #dc2626;
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 600;
    border-radius: 9999px;
    padding: 6px 16px;
    border: 1px solid #dc2626;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background-color 0.15s ease;
  }

  .modal-btn-danger:hover {
    background-color: #b91c1c;
    border-color: #b91c1c;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
