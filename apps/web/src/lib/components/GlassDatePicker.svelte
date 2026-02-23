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

  // Track whether we caused the last value change (to avoid re-parsing our own output)
  let selfUpdate = false;

  // Parse external value prop into internal state
  $effect(() => {
    if (selfUpdate) return;
    if (value) {
      // Accept both YYYY-MM-DD and full ISO strings
      const parts = value.split("T")[0].split("-");
      if (parts.length === 3) {
        selectedDate = new CalendarDate(Number(parts[0]), Number(parts[1]), Number(parts[2]));
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
    return `${y}-${m}-${d}`;
  }

  const isoString = $derived(buildIso());

  const displayText = $derived.by(() => {
    if (!selectedDate) return "";
    const d = new Date(`${isoString}T00:00:00`);
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  });

  function emitChange() {
    const iso = buildIso();
    if (iso && iso !== value) {
      selfUpdate = true;
      onchange?.(iso);
      queueMicrotask(() => { selfUpdate = false; });
    }
  }

  function handleDateSelect(newDate: DateValue | undefined) {
    selectedDate = newDate;
    emitChange();
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
