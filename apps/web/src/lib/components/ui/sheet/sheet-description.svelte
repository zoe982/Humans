<script lang="ts">
	import { Dialog as SheetPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = SheetPrimitive.DescriptionProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<SheetPrimitive.Description class={cn("text-sm text-text-muted", className)} {...restProps}>
	{@render children?.()}
</SheetPrimitive.Description>
