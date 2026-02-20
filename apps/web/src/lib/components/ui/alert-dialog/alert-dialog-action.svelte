<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";
	import { buttonVariants } from "$lib/components/ui/button/index.js";

	type Props = AlertDialogPrimitive.ActionProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<AlertDialogPrimitive.Action class={cn(buttonVariants(), className)} {...restProps}>
	{@render children?.()}
</AlertDialogPrimitive.Action>
