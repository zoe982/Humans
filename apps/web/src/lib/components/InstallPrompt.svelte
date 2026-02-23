<script lang="ts">
  import { onMount } from "svelte";
  import { Download, X } from "lucide-svelte";

  let installEvent: BeforeInstallPromptEvent | null = $state(null);
  let visible = $state(false);

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }

  onMount(() => {
    // Skip if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Skip on mobile (show install prompt only on desktop)
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

    // Skip if dismissed within 30 days
    const dismissedAt = localStorage.getItem("pwa-install-dismissed-at");
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      installEvent = e as BeforeInstallPromptEvent;
      // Show after 3s delay
      setTimeout(() => {
        visible = true;
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  });

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      visible = false;
    }
    installEvent = null;
  }

  function dismiss() {
    visible = false;
    localStorage.setItem("pwa-install-dismissed-at", String(Date.now()));
  }
</script>

{#if visible}
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 glass-card-strong p-4 shadow-xl rounded-xl max-w-md w-[calc(100%-2rem)] flex items-start gap-3">
    <div class="rounded-lg bg-accent/10 p-2 shrink-0">
      <Download size={20} class="text-accent" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-text-primary">Get the Humans desktop app</p>
      <p class="text-xs text-text-muted mt-0.5">Quick access from your dock — no browser tab needed.</p>
      <button
        type="button"
        onclick={install}
        class="mt-2 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent/90 transition-colors"
      >
        Install app
      </button>
    </div>
    <button
      type="button"
      onclick={dismiss}
      class="text-text-muted hover:text-text-primary shrink-0"
      aria-label="Dismiss install prompt"
    >
      <X size={16} />
    </button>
  </div>
{/if}
