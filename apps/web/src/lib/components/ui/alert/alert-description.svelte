<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLParagraphElement> & {
		class?: string;
	};

	let { class: className, children, ...restProps }: Props = $props();
</script>

<div class={cn("text-sm [&_p]:leading-relaxed", className)} {...restProps}>
	{@render children?.()}
</div>
