<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = AlertDialogPrimitive.DescriptionProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<AlertDialogPrimitive.Description class={cn("text-sm text-text-secondary", className)} {...restProps}>
	{@render children?.()}
</AlertDialogPrimitive.Description>
