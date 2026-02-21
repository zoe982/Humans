<script lang="ts">
  type Props = {
    text: string;
    query: string;
    class?: string;
  };

  let { text, query, class: className }: Props = $props();

  function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  const parts = $derived.by(() => {
    const q = query.trim();
    if (!q || !text) return [{ text, highlight: false }];
    try {
      const regex = new RegExp(`(${escapeRegex(q)})`, "gi");
      const segments = text.split(regex);
      const lowerQ = q.toLowerCase();
      return segments
        .filter((s) => s.length > 0)
        .map((s) => ({
          text: s,
          highlight: s.toLowerCase() === lowerQ,
        }));
    } catch {
      return [{ text, highlight: false }];
    }
  });
</script>

{#if className}<span class={className}>{#each parts as part}{#if part.highlight}<mark class="search-highlight">{part.text}</mark>{:else}{part.text}{/if}{/each}</span>{:else}{#each parts as part}{#if part.highlight}<mark class="search-highlight">{part.text}</mark>{:else}{part.text}{/if}{/each}{/if}
