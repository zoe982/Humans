<script lang="ts">
	import { Dialog as SheetPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";
	import SheetOverlay from "./sheet-overlay.svelte";

	type Side = "top" | "bottom" | "left" | "right";

	type Props = SheetPrimitive.ContentProps & {
		class?: string;
		side?: Side;
	};

	let {
		class: className,
		side = "right",
		children,
		...restProps
	}: Props = $props();

	const sideClasses: Record<Side, string> = {
		top: "inset-x-0 top-0 border-b",
		bottom: "inset-x-0 bottom-0 border-t",
		left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-r sm:max-w-sm",
	};
</script>

<SheetPrimitive.Portal>
	<SheetOverlay />
	<SheetPrimitive.Content
		class={cn(
			"fixed z-50 gap-4 glass-card-strong p-6 shadow-lg transition ease-in-out border-glass-border",
			sideClasses[side],
			className,
		)}
		{...restProps}
	>
		{@render children?.()}
	</SheetPrimitive.Content>
</SheetPrimitive.Portal>
