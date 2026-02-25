<script lang="ts">
  type Props = {
    name: string;
    id?: string;
    value?: string;
    onchange?: (value: string) => void;
  };

  let { name, id, value = "", onchange }: Props = $props();

  function handleInput(e: Event) {
    const input = e.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    onchange?.(input.value);
  }
</script>

<input
  type="date"
  {name}
  {id}
  value={value}
  oninput={handleInput}
  onclick={(e) => { (e.currentTarget as HTMLInputElement).showPicker(); }}
  class="glass-input h-10 w-full px-3 py-2 text-sm cursor-pointer"
/>
