<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLDivElement> & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<div class={cn("glass-card", className)} {...restProps}>
	{@render children?.()}
</div>
