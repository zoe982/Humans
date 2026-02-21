<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";
	import DialogOverlay from "./dialog-overlay.svelte";

	type Props = DialogPrimitive.ContentProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Portal>
	<DialogOverlay />
	<DialogPrimitive.Content
		class={cn(
			"fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 glass-dialog p-6 shadow-lg duration-200 max-h-[85vh] overflow-y-auto mx-4 sm:mx-0",
			className,
		)}
		{...restProps}
	>
		{@render children?.()}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
