<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = AlertDialogPrimitive.TitleProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<AlertDialogPrimitive.Title class={cn("text-lg font-semibold text-text-primary", className)} {...restProps}>
	{@render children?.()}
</AlertDialogPrimitive.Title>
