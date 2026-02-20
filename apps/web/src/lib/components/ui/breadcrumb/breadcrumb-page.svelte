<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLSpanElement> & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<span
	role="link"
	aria-disabled="true"
	aria-current="page"
	class={cn("font-normal text-text-primary", className)}
	{...restProps}
>
	{@render children?.()}
</span>
