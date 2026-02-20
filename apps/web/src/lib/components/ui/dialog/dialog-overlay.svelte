<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = DialogPrimitive.OverlayProps & { class?: string };
	let { class: className, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Overlay
	class={cn("fixed inset-0 z-50 bg-black/50", className)}
	{...restProps}
/>
