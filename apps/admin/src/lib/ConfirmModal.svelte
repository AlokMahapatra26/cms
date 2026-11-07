<script lang="ts">
  import { modal } from '$lib/modal.svelte';
  import { Modal, Button } from '$lib/components';
</script>

<Modal
  open={modal.isOpen}
  title={modal.title}
  icon={modal.variant}
  onclose={() => modal.handleCancel()}
>
  <p class="modal-message">{modal.message}</p>

  {#snippet footer()}
    {#if !modal.isAlert}
      <Button variant="outline" onclick={() => modal.handleCancel()}>
        {modal.cancelText}
      </Button>
    {/if}

    <Button
      variant={modal.variant === 'danger' ? 'danger' : 'primary'}
      onclick={() => modal.handleConfirm()}
    >
      {modal.confirmText}
    </Button>
  {/snippet}
</Modal>
