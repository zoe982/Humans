<script lang="ts">
  import type { Snippet, Component } from "svelte";

  type Props = {
    icon?: Component<{ size?: number; class?: string }>;
    message: string;
    action?: Snippet;
  };

  let { icon, message, action }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 px-4 text-center">
  {#if icon}
    <div class="mb-3 text-text-muted">
      <svelte:component this={icon} size={40} class="opacity-50" />
    </div>
  {/if}
  <p class="text-sm text-text-muted">{message}</p>
  {#if action}
    <div class="mt-4">
      {@render action()}
    </div>
  {/if}
</div>
