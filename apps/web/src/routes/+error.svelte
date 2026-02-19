<script lang="ts">
  import { page } from "$app/stores";
</script>

<svelte:head>
  <title>Error - Humans CRM</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
  <div class="text-center">
    <p class="text-5xl font-bold text-blue-700">{$page.status}</p>
    <h1 class="mt-4 text-2xl font-semibold text-gray-900">{$page.error?.message ?? "Something went wrong"}</h1>
    <div class="mt-6 flex justify-center gap-4">
      <a href="/dashboard" class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
        Go to Dashboard
      </a>
      <a href="/" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Home
      </a>
    </div>
  </div>
</div>
