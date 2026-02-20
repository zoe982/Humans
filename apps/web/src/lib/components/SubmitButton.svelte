<script lang="ts">
  import { Loader2 } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button/index.js";

  type Props = {
    label: string;
    submitting?: boolean;
    class?: string;
  };

  let { label, submitting = false, class: className }: Props = $props();
</script>

<Button type="submit" class={className} disabled={submitting}>
  {#if submitting}
    <Loader2 size={16} class="inline animate-spin -mt-0.5 mr-1" />
  {/if}
  {label}
</Button>
