<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLHeadingElement> & {
		class?: string;
	};

	let { class: className, children, ...restProps }: Props = $props();
</script>

<h5 class={cn("mb-1 font-medium leading-none tracking-tight", className)} {...restProps}>
	{@render children?.()}
</h5>
