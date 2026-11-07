<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'mint' | 'gray' | 'field' | 'collection';
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'gray',
    class: customClass = '',
    children
  }: Props = $props();

  let badgeClass = $derived.by(() => {
    let base = 'pill-tag-gray';
    if (variant === 'mint') base = 'pill-tag-mint';
    else if (variant === 'field') base = 'field-badge';
    else if (variant === 'collection') base = 'collection-badge';
    return [base, customClass].filter(Boolean).join(' ');
  });
</script>

<span class={badgeClass}>
  {#if children}
    {@render children()}
  {/if}
</span>
