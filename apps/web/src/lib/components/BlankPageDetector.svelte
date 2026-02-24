<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { getCapturedErrors, buildDiagnosticReport } from "$lib/client-diagnostics";

  type Props = {
    contentSelector?: string;
    delayMs?: number;
  };

  let {
    contentSelector = "#main-content",
    delayMs = 3000,
  }: Props = $props();

  let diagnostics = $state<string | null>(null);

  onMount(() => {
    if (!browser) return;

    const timer = setTimeout(() => {
      const main = document.querySelector(contentSelector);
      if (main == null) {
        diagnostics = buildDiagnosticReport("Main content element not found in DOM");
        return;
      }

      // Check if main content area has meaningful visible content
      const text = (main.textContent ?? "").trim();
      const childCount = main.children.length;

      // A blank page typically has 0 children or very little text.
      // The layout always renders <main> but the page content goes inside it.
      // If the page component failed to render, main will have 0 children.
      if (childCount === 0 || text.length < 10) {
        diagnostics = buildDiagnosticReport(
          `Content area appears empty (children: ${String(childCount)}, text length: ${String(text.length)})`
        );
      }
    }, delayMs);

    return () => clearTimeout(timer);
  });
</script>

{#if diagnostics}
  <div
    style="
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
      background: rgba(220, 38, 38, 0.95); color: white;
      padding: 16px; font-family: monospace; font-size: 12px;
      max-height: 50vh; overflow-y: auto; backdrop-filter: blur(8px);
      border-top: 2px solid #ef4444;
    "
  >
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <strong style="font-size: 14px;">Page Load Error Detected</strong>
      <div style="display: flex; gap: 8px;">
        <button
          type="button"
          onclick={() => { void navigator.clipboard.writeText(diagnostics ?? ""); }}
          style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
        >
          Copy
        </button>
        <button
          type="button"
          onclick={() => { diagnostics = null; }}
          style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
        >
          Dismiss
        </button>
      </div>
    </div>
    <pre style="white-space: pre-wrap; word-break: break-all; margin: 0;">{diagnostics}</pre>
  </div>
{/if}
