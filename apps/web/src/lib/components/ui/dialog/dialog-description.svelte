<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = DialogPrimitive.DescriptionProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Description class={cn("text-sm text-text-secondary", className)} {...restProps}>
	{@render children?.()}
</DialogPrimitive.Description>
