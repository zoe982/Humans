<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
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
  let popoverOpen = $state(false);

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
      // Only clear selectedDate if we haven't emitted anything yet.
      // If lastEmitted is set but value is empty, it means there's no external binding —
      // don't clear the user's selection.
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
    popoverOpen = false;
  }
</script>

<input type="hidden" {name} {id} value={isoString} />

<Popover.Root bind:open={popoverOpen}>
  <Popover.Trigger
    class="glass-input flex h-10 w-full items-center gap-2 px-3 py-2 text-sm"
  >
    <CalendarDays class="h-4 w-4 text-text-muted shrink-0" />
    <span class={selectedDate ? "text-text-primary" : "text-text-muted"}>
      {displayText || "Pick date..."}
    </span>
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar
      type="single"
      value={selectedDate}
      onValueChange={handleDateSelect}
      placeholder={selectedDate ?? today(getLocalTimeZone())}
    />
  </Popover.Content>
</Popover.Root>
