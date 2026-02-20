<script lang="ts">
	import type { HTMLLabelAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLLabelAttributes & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<label
	class={cn(
		"text-sm font-medium leading-none text-text-secondary peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</label>
