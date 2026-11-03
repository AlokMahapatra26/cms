<script lang="ts">
  let { children } = $props();
</script>

<div style="max-width: 900px; margin: 20px auto; padding: 0 16px; font-family: monospace;">
  <header>
    <h2>CMS Admin (Edge / Workers / D1 / R2)</h2>
    <nav style="display: flex; gap: 16px; margin-bottom: 12px;">
      <a href="/">[ All Posts ]</a>
      <a href="/new">[ + New Post ]</a>
      <a href="http://localhost:4321" target="_blank" rel="noopener">[ Open Public Blog -> ]</a>
    </nav>
  </header>
  <hr style="border: none; border-top: 1px solid #ccc; margin-bottom: 20px;" />

  <main>
    {@render children()}
  </main>
</div>

