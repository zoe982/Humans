<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";
	import Check from "lucide-svelte/icons/check";

	type Props = SelectPrimitive.ItemProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<SelectPrimitive.Item
	class={cn(
		"relative flex w-full cursor-default select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm outline-none text-text-primary data-[highlighted]:bg-glass-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		className,
	)}
	{...restProps}
>
	<span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
		<SelectPrimitive.ItemIndicator>
			<Check class="h-4 w-4 text-accent" />
		</SelectPrimitive.ItemIndicator>
	</span>
	{@render children?.()}
</SelectPrimitive.Item>
