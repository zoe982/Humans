<script lang="ts">
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
  <div
    role={type === 'error' ? 'alert' : 'status'}
    class="glass-card p-4 mb-4 {type === 'error'
      ? 'border-red-500/30 bg-red-500/10 text-red-300'
      : 'border-green-500/30 bg-green-500/10 text-green-300'}"
  >
    {message}
    {#if type === "error" && (code || truncatedRef)}
      <p class="mt-1 font-mono text-xs opacity-70">
        {#if code}{code}{/if}
        {#if code && truncatedRef} · {/if}
        {#if truncatedRef}Ref: {truncatedRef}{/if}
      </p>
    {/if}
  </div>
{/if}
