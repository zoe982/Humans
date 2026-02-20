<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLParagraphElement> & { class?: string };
	let { class: className, children, ...restProps }: Props = $props();
</script>

<p class={cn("text-sm text-text-muted", className)} {...restProps}>
	{@render children?.()}
</p>
