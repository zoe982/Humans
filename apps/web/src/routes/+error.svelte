<script lang="ts">
  import { page } from "$app/stores";
  import { resolve } from "$app/paths";

  const truncatedRef = $derived(
    $page.error?.requestId ? $page.error.requestId.slice(0, 8) : null,
  );
</script>

<svelte:head>
  <title>Error - Humans</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
  <div class="text-center">
    <p class="text-5xl font-bold text-accent">{$page.status}</p>
    <h1 class="mt-4 text-2xl font-semibold text-text-primary">{$page.error?.message ?? "Something went wrong"}</h1>
    {#if $page.error?.code || truncatedRef}
      <p class="mt-2 font-mono text-xs text-text-secondary">
        {#if $page.error?.code}{$page.error.code}{/if}
        {#if $page.error?.code && truncatedRef} · {/if}
        {#if truncatedRef}Ref: {truncatedRef}{/if}
      </p>
    {/if}
    <div class="mt-6 flex justify-center gap-4">
      <a href={resolve('/dashboard')} class="btn-primary">
        Go to Dashboard
      </a>
      <a href={resolve('/')} class="btn-ghost">
        Home
      </a>
    </div>
  </div>
</div>
