<script lang="ts">
  import HighlightText from "./HighlightText.svelte";

  type Props = {
    text: string;
    query: string;
  };

  let { text, query }: Props = $props();

  type Segment = { type: "text"; value: string } | { type: "url"; value: string };

  const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

  const segments = $derived.by((): Segment[] => {
    if (!text) return [];
    const result: Segment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    URL_RE.lastIndex = 0;
    while ((match = URL_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      result.push({ type: "url", value: match[0] });
      lastIndex = URL_RE.lastIndex;
    }
    if (lastIndex < text.length) {
      result.push({ type: "text", value: text.slice(lastIndex) });
    }
    return result;
  });
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="whitespace-pre-line">{#each segments as seg, i (i)}{#if seg.type === "url"}<a href={seg.value} target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">{seg.value}</a>{:else}<HighlightText text={seg.value} query={query} />{/if}{/each}</div>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
