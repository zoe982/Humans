<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLDivElement> & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<div class={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...restProps}>
	{@render children?.()}
</div>
