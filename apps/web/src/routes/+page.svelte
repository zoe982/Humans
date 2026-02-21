<script lang="ts">
  import type { PageData } from "./$types";
  import { Users } from "lucide-svelte";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Humans - Pet Air Valet</title>
</svelte:head>

{#if !data.user}
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <h1 class="mb-4 text-4xl font-bold text-text-primary inline-flex items-center gap-3"><Users size={36} /> Humans</h1>
      <p class="mb-8 text-lg text-text-secondary">Pet Air Valet Customer Management</p>
      <a
        href="/login"
        class="btn-primary inline-block px-6 py-3"
      >
        Sign In
      </a>
    </div>
  </div>
{:else}
  <meta http-equiv="refresh" content="0;url=/dashboard" />
{/if}
