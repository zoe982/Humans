<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";
	import ChevronDown from "lucide-svelte/icons/chevron-down";

	type Props = SelectPrimitive.TriggerProps & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<SelectPrimitive.Trigger
	class={cn(
		"glass-input flex h-10 w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
	<ChevronDown class="h-4 w-4 shrink-0 text-text-muted" />
</SelectPrimitive.Trigger>
