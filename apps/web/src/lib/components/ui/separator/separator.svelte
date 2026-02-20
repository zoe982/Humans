<script lang="ts">
	import { Separator as SeparatorPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = SeparatorPrimitive.RootProps & { class?: string };

	let {
		class: className,
		orientation = "horizontal",
		decorative = true,
		...restProps
	}: Props = $props();
</script>

<SeparatorPrimitive.Root
	{decorative}
	{orientation}
	class={cn(
		"shrink-0 bg-glass-border",
		orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
		className,
	)}
	{...restProps}
/>
