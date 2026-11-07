<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'aloe' | 'outline' | 'danger' | 'gray';
    size?: 'md' | 'sm';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    href?: string;
    class?: string;
    title?: string;
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    href,
    class: customClass = '',
    title,
    onclick,
    children
  }: Props = $props();

  let buttonClass = $derived.by(() => {
    let base = '';
    if (size === 'sm') {
      if (variant === 'aloe') base = 'btn-sm-pill btn-aloe-sm';
      else if (variant === 'danger') base = 'btn-sm-pill btn-danger-sm';
      else if (variant === 'gray') base = 'btn-sm-pill btn-gray-sm';
      else if (variant === 'outline') base = 'btn-outline-pill';
      else base = 'btn-sm-pill btn-gray-sm';
    } else {
      if (variant === 'aloe') base = 'btn-aloe-pill';
      else if (variant === 'danger') base = 'btn-danger-pill';
      else if (variant === 'outline') base = 'btn-outline-pill';
      else if (variant === 'gray') base = 'btn-outline-pill';
      else base = 'btn-primary-pill';
    }
    return [base, customClass].filter(Boolean).join(' ');
  });
</script>

{#if href}
  <a {href} class={buttonClass} {title} role="button">
    {#if children}
      {@render children()}
    {/if}
  </a>
{:else}
  <button
    {type}
    class={buttonClass}
    disabled={disabled || loading}
    {title}
    {onclick}
  >
    {#if loading}
      <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </button>
{/if}
