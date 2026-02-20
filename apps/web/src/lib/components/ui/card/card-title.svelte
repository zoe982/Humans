<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLHeadingElement> & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<h3 class={cn("text-2xl font-semibold leading-none tracking-tight text-text-primary", className)} {...restProps}>
	{@render children?.()}
</h3>
