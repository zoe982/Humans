<script lang="ts">
  type Props = {
    type?: "success" | "error";
    message: string;
  };

  let { type = "success", message }: Props = $props();
</script>

{#if message}
  <div
    class="glass-card p-4 mb-4 {type === 'error'
      ? 'border-red-500/30 bg-red-500/10 text-red-300'
      : 'border-green-500/30 bg-green-500/10 text-green-300'}"
  >
    {message}
  </div>
{/if}
