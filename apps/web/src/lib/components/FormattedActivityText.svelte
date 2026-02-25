<script lang="ts">
  import HighlightText from "./HighlightText.svelte";
  import { ExternalLink, ShieldAlert } from "lucide-svelte";
  import { classifyLink } from "$lib/utils/link-safety";

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

  function handleSuspiciousClick(e: MouseEvent, url: string): void {
    try {
      const domain = new URL(url).hostname;
      if (!confirm(`This link looks suspicious. Are you sure you want to open ${domain}?`)) {
        e.preventDefault();
      }
    } catch {
      e.preventDefault();
    }
  }
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="whitespace-pre-line">{#each segments as seg, i (i)}{#if seg.type === "url"}{#if classifyLink(seg.value) === "suspicious"}<a href={seg.value} target="_blank" rel="noopener noreferrer" class="text-amber-500 hover:underline inline-flex items-center gap-0.5" onclick={(e) => handleSuspiciousClick(e, seg.value)}>{seg.value}<ShieldAlert class="inline h-3 w-3 flex-shrink-0" /></a>{:else}<a href={seg.value} target="_blank" rel="noopener noreferrer" class="text-accent hover:underline inline-flex items-center gap-0.5">{seg.value}<ExternalLink class="inline h-3 w-3 flex-shrink-0" /></a>{/if}{:else}<HighlightText text={seg.value} query={query} />{/if}{/each}</div>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
