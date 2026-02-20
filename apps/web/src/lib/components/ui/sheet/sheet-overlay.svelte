<script lang="ts">
	import { Dialog as SheetPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = SheetPrimitive.OverlayProps & { class?: string };
	let { class: className, ...restProps }: Props = $props();
</script>

<SheetPrimitive.Overlay
	class={cn("fixed inset-0 z-50 bg-black/50", className)}
	{...restProps}
/>
