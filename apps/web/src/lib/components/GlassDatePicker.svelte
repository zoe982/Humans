<script lang="ts">
  import { Calendar } from "$lib/components/ui/calendar";
  import { CalendarDate, type DateValue, today, getLocalTimeZone } from "@internationalized/date";
  import CalendarDays from "lucide-svelte/icons/calendar-days";

  type Props = {
    name: string;
    id?: string;
    value?: string;
    onchange?: (value: string) => void;
  };

  let { name, id, value, onchange }: Props = $props();

  let selectedDate = $state<DateValue | undefined>(undefined);
  let open = $state(false);

  // Plain variable (NOT $state) — we do NOT want this to trigger effect re-runs.
  // It's only read inside the effect to guard against re-parsing our own output.
  let lastEmitted = "";

  // Sync external value prop into internal selectedDate.
  // Only tracks `value` (reactive prop). Does NOT track `lastEmitted` (plain let).
  $effect(() => {
    const v = value ?? "";
    if (v === lastEmitted) return;
    if (v) {
      const parts = v.split("T")[0].split("-");
      if (parts.length === 3) {
        selectedDate = new CalendarDate(Number(parts[0]), Number(parts[1]), Number(parts[2]));
      }
    } else if (lastEmitted === "") {
      selectedDate = undefined;
    }
  });

  function buildIso(date: DateValue | undefined): string {
    if (!date) return "";
    const y = date.year;
    const m = String(date.month).padStart(2, "0");
    const d = String(date.day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const isoString = $derived(buildIso(selectedDate));

  const displayText = $derived.by(() => {
    if (!selectedDate) return "";
    const d = new Date(`${isoString}T00:00:00`);
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  });

  function handleDateSelect(newDate: DateValue | undefined) {
    selectedDate = newDate;
    const iso = buildIso(newDate);
    if (iso !== (value ?? "")) {
      lastEmitted = iso;
      onchange?.(iso);
    }
    open = false;
  }

  function handleTriggerClick() {
    open = !open;
  }

  // Close when clicking outside
  function handleWindowClick(e: MouseEvent) {
    const target = e.target;
    if (target instanceof Node && containerEl && !containerEl.contains(target)) {
      open = false;
    }
  }

  let containerEl: HTMLDivElement | undefined = $state(undefined);
</script>

<svelte:window onclick={handleWindowClick} />

<input type="hidden" {name} {id} value={isoString} />

<div class="relative" bind:this={containerEl}>
  <button
    type="button"
    class="glass-input flex h-10 w-full items-center gap-2 px-3 py-2 text-sm"
    data-state={open ? "open" : "closed"}
    onclick={handleTriggerClick}
  >
    <CalendarDays class="h-4 w-4 text-text-muted shrink-0" />
    <span class={selectedDate ? "text-text-primary" : "text-text-muted"}>
      {displayText || "Pick date..."}
    </span>
  </button>
  {#if open}
    <div class="glass-popover absolute left-0 top-full z-50 mt-1 w-auto p-0">
      <Calendar
        type="single"
        value={selectedDate}
        onValueChange={handleDateSelect}
        placeholder={selectedDate ?? today(getLocalTimeZone())}
      />
    </div>
  {/if}
</div>
