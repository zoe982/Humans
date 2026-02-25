<script lang="ts">
  type Props = {
    name: string;
    id?: string;
    value?: string;
    onchange?: (value: string) => void;
  };

  let { name, id, value = "", onchange }: Props = $props();

  // datetime-local uses "YYYY-MM-DDThh:mm" (no seconds)
  const inputValue = $derived(value ? value.slice(0, 16) : "");

  function handleInput(e: Event) {
    const input = e.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    // Normalize to include seconds for consistency with existing API
    const v = input.value;
    onchange?.(v ? `${v}:00` : "");
  }
</script>

<input
  type="datetime-local"
  {name}
  {id}
  value={inputValue}
  oninput={handleInput}
  onclick={(e) => { (e.currentTarget as HTMLInputElement).showPicker(); }}
  class="glass-input h-10 w-full px-3 py-2 text-sm cursor-pointer"
/>
