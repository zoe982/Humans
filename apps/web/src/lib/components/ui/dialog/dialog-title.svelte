<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = DialogPrimitive.TitleProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Title class={cn("text-lg font-semibold leading-none tracking-tight text-text-primary", className)} {...restProps}>
	{@render children?.()}
</DialogPrimitive.Title>
