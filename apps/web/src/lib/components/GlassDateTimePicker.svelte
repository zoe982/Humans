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
  let hour = $state(12);
  let minute = $state(0);

  // Reactively parse value prop whenever it changes
  $effect(() => {
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

  const isoString = $derived.by(() => {
    if (!selectedDate) return "";
    const y = selectedDate.year;
    const m = String(selectedDate.month).padStart(2, "0");
    const d = String(selectedDate.day).padStart(2, "0");
    const h = String(hour).padStart(2, "0");
    const min = String(minute).padStart(2, "0");
    return `${y}-${m}-${d}T${h}:${min}:00`;
  });

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

  // Notify parent when value changes (guard against feedback loops)
  $effect(() => {
    if (isoString && isoString !== value) {
      onchange?.(isoString);
    }
  });

  let popoverOpen = $state(false);
</script>

<input type="hidden" {name} {id} value={isoString} />

<Popover.Root bind:open={popoverOpen}>
  <Popover.Trigger
    class="glass-input flex h-10 w-full items-center gap-2 px-3 py-2 text-sm"
  >
    <CalendarDays class="h-4 w-4 text-text-muted shrink-0" />
    <span class={selectedDate ? "text-text-primary" : "text-text-muted"}>
      {displayText || "Pick date & time..."}
    </span>
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar
      type="single"
      bind:value={selectedDate}
      placeholder={selectedDate ?? today(getLocalTimeZone())}
    />
    <div class="flex items-center gap-2 px-4 pb-4 pt-1">
      <span class="text-xs text-text-muted">Time:</span>
      <input
        type="number"
        min="0"
        max="23"
        bind:value={hour}
        class="glass-input w-14 px-2 py-1 text-sm text-center"
      />
      <span class="text-text-muted">:</span>
      <input
        type="number"
        min="0"
        max="59"
        bind:value={minute}
        class="glass-input w-14 px-2 py-1 text-sm text-center"
      />
    </div>
  </Popover.Content>
</Popover.Root>
