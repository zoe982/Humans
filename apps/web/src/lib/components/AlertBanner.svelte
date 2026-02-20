<script lang="ts">
  import { Root as Alert } from "$lib/components/ui/alert/index.js";

  type Props = {
    type?: "success" | "error";
    message: string;
    code?: string;
    requestId?: string;
  };

  let { type = "success", message, code, requestId }: Props = $props();

  const truncatedRef = $derived(requestId ? requestId.slice(0, 8) : null);
</script>

{#if message}
  <Alert
    variant={type === "error" ? "destructive" : "default"}
    role={type === "success" ? "status" : "alert"}
    class="mb-4 {type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : ''}"
  >
    {message}
    {#if type === "error" && (code || truncatedRef)}
      <p class="mt-1 font-mono text-xs opacity-70">
        {#if code}{code}{/if}
        {#if code && truncatedRef} · {/if}
        {#if truncatedRef}Ref: {truncatedRef}{/if}
      </p>
    {/if}
  </Alert>
{/if}
