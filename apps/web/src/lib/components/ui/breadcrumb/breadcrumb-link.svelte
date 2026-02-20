<script lang="ts">
	import type { HTMLAnchorAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAnchorAttributes & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<a
	class={cn("transition-colors hover:text-text-primary", className)}
	{...restProps}
>
	{@render children?.()}
</a>
