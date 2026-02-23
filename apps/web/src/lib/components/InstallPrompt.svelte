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
  <div class="fixed bottom-4 left-4 z-50 glass-card-strong p-4 shadow-xl flex items-center gap-3">
    <Download size={18} class="text-accent shrink-0" />
    <span class="text-sm text-text-primary">Install Humans as a desktop app</span>
    <button
      type="button"
      onclick={install}
      class="text-sm font-medium text-accent hover:text-[var(--link-hover)] whitespace-nowrap"
    >
      Install
    </button>
    <button
      type="button"
      onclick={dismiss}
      class="text-text-muted hover:text-text-primary"
      aria-label="Dismiss install prompt"
    >
      <X size={16} />
    </button>
  </div>
{/if}
