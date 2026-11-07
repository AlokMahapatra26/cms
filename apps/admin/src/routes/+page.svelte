<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { collectionsStore } from '$lib/collections.svelte';

  onMount(async () => {
    try {
      await collectionsStore.load();
      if (collectionsStore.list.length > 0) {
        goto(`/content/${collectionsStore.list[0].slug}`, { replaceState: true });
      } else {
        goto('/schemas', { replaceState: true });
      }
    } catch {
      goto('/schemas', { replaceState: true });
    }
  });
</script>

<div class="p-12 text-center text-muted text-sm">
  Loading...
</div>
