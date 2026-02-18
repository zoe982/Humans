<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Humans CRM - Pet Air Valet</title>
</svelte:head>

{#if !data.user}
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <h1 class="mb-4 text-4xl font-bold text-gray-900">Humans CRM</h1>
      <p class="mb-8 text-lg text-gray-600">Pet Air Valet Customer Management</p>
      <a
        href="/login"
        class="rounded-lg bg-brand px-6 py-3 text-white hover:bg-brand-dark"
      >
        Sign In
      </a>
    </div>
  </div>
{:else}
  <meta http-equiv="refresh" content="0;url=/dashboard" />
{/if}
