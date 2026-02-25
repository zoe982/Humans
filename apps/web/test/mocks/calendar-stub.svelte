<script lang="ts">
  import { CalendarDate } from "@internationalized/date";

  type Props = {
    type?: string;
    value?: unknown;
    onValueChange?: (date: CalendarDate | undefined) => void;
    placeholder?: unknown;
  };

  let { onValueChange }: Props = $props();

  // Hard-coded to 2026-02 to produce predictable CalendarDate values for assertions.
  // Tests assert against these exact values — update both if changing the stub's date.
  function pickDay(day: number) {
    onValueChange?.(new CalendarDate(2026, 2, day));
  }
</script>

<div data-mock-calendar>
  {#each [1, 2, 3, 15, 28] as day (day)}
    <button type="button" data-day={day} onclick={() => pickDay(day)}>
      {day}
    </button>
  {/each}
</div>
