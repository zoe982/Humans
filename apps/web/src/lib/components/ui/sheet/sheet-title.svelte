<script lang="ts">
	import { Dialog as SheetPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = SheetPrimitive.TitleProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<SheetPrimitive.Title class={cn("text-lg font-semibold text-text-primary", className)} {...restProps}>
	{@render children?.()}
</SheetPrimitive.Title>
