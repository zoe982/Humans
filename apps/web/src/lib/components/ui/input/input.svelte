<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLInputAttributes & { class?: string };
	let { class: className, type = "text", ...restProps }: Props = $props();
</script>

<input
	{type}
	class={cn(
		"glass-input flex h-10 w-full px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium",
		className,
	)}
	{...restProps}
/>
