<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLLIElement> & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<li class={cn("inline-flex items-center gap-1.5", className)} {...restProps}>
	{@render children?.()}
</li>
