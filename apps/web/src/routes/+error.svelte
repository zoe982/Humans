<script lang="ts">
  import { page } from "$app/stores";
</script>

<svelte:head>
  <title>Error - Humans CRM</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
  <div class="text-center">
    <p class="text-5xl font-bold text-accent">{$page.status}</p>
    <h1 class="mt-4 text-2xl font-semibold text-text-primary">{$page.error?.message ?? "Something went wrong"}</h1>
    <div class="mt-6 flex justify-center gap-4">
      <a href="/dashboard" class="btn-primary">
        Go to Dashboard
      </a>
      <a href="/" class="btn-ghost">
        Home
      </a>
    </div>
  </div>
</div>
