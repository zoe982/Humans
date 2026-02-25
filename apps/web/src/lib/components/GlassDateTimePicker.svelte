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
  let hour = $state(12);
  let minute = $state(0);
  let open = $state(false);

  // Track whether we caused the last value change (to avoid re-parsing our own output)
  let selfUpdate = false;

  // Parse external value prop into internal state
  $effect(() => {
    if (selfUpdate) return;
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        selectedDate = new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
        hour = d.getHours();
        minute = d.getMinutes();
      }
    } else {
      selectedDate = undefined;
    }
  });

  function buildIso(): string {
    if (!selectedDate) return "";
    const y = selectedDate.year;
    const m = String(selectedDate.month).padStart(2, "0");
    const d = String(selectedDate.day).padStart(2, "0");
    const h = String(hour).padStart(2, "0");
    const min = String(minute).padStart(2, "0");
    return `${y}-${m}-${d}T${h}:${min}:00`;
  }

  const isoString = $derived(buildIso());

  const displayText = $derived.by(() => {
    if (!selectedDate) return "";
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  function emitChange() {
    const iso = buildIso();
    if (iso && iso !== value) {
      selfUpdate = true;
      onchange?.(iso);
      // Reset on next microtask so the prop-parse effect skips this cycle
      queueMicrotask(() => { selfUpdate = false; });
    }
  }

  function handleDateSelect(newDate: DateValue | undefined) {
    selectedDate = newDate;
    emitChange();
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
      {displayText || "Pick date & time..."}
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
      <div class="flex items-center gap-2 px-4 pb-4 pt-1">
        <span class="text-xs text-text-muted">Time:</span>
        <input
          type="number"
          min="0"
          max="23"
          bind:value={hour}
          oninput={() => emitChange()}
          class="glass-input w-14 px-2 py-1 text-sm text-center"
        />
        <span class="text-text-muted">:</span>
        <input
          type="number"
          min="0"
          max="59"
          bind:value={minute}
          oninput={() => emitChange()}
          class="glass-input w-14 px-2 py-1 text-sm text-center"
        />
      </div>
    </div>
  {/if}
</div>
