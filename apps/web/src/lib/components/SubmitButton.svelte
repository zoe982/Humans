<script lang="ts">
  import { Loader2 } from "lucide-svelte";

  type Props = {
    label: string;
    submitting?: boolean;
    class?: string;
  };

  let { label, submitting = false, class: className = "btn-primary text-sm" }: Props = $props();
</script>

<button type="submit" class={className} disabled={submitting}>
  {#if submitting}
    <Loader2 size={16} class="inline animate-spin -mt-0.5 mr-1" />
  {/if}
  {label}
</button>
