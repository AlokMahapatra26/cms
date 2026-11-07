<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    compact?: boolean;
    elevated?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    compact = false,
    elevated = false,
    class: customClass = '',
    children
  }: Props = $props();

  let cardClass = $derived.by(() => {
    const classes = ['shopify-card'];
    if (compact) classes.push('compact');
    if (elevated) classes.push('elevated');
    if (customClass) classes.push(customClass);
    return classes.join(' ');
  });
</script>

<div class={cardClass}>
  {#if children}
    {@render children()}
  {/if}
</div>

