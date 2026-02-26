<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";
	import Check from "lucide-svelte/icons/check";
	import type { Snippet } from "svelte";

	type Props = Omit<SelectPrimitive.ItemProps, "children"> & {
		class?: string;
		children?: Snippet;
	};
	let { class: className, children: innerChildren, ...restProps }: Props = $props();
</script>

<SelectPrimitive.Item
	class={cn(
		"glass-dropdown-item flex w-full items-center justify-between gap-3 outline-none data-[highlighted]:bg-[rgba(255,255,255,0.12)] data-[selected]:bg-accent-dim data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		className,
	)}
	{...restProps as SelectPrimitive.ItemProps}
>
	{#snippet children({ selected })}
		<span class="truncate">{@render innerChildren?.()}</span>
		<span class="flex h-4 w-4 shrink-0 items-center justify-center">
			{#if selected}
				<Check class="h-4 w-4 text-accent" />
			{/if}
		</span>
	{/snippet}
</SelectPrimitive.Item>
