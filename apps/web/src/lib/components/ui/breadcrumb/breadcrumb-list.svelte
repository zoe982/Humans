<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLOListElement> & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<ol
	class={cn(
		"flex flex-wrap items-center gap-1.5 break-words text-sm text-text-muted sm:gap-2.5",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</ol>
