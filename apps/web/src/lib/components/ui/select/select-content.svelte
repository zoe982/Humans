<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = SelectPrimitive.ContentProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<SelectPrimitive.Portal>
	<SelectPrimitive.Content
		class={cn(
			"glass-popover relative z-50 max-h-96 min-w-[8rem] overflow-hidden p-1",
			className,
		)}
		{...restProps}
	>
		<SelectPrimitive.Viewport class="p-1">
			{@render children?.()}
		</SelectPrimitive.Viewport>
	</SelectPrimitive.Content>
</SelectPrimitive.Portal>
