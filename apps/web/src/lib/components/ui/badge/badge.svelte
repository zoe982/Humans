<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";
	import { badgeVariants, type BadgeVariant } from "./index.js";

	type Props = HTMLAttributes<HTMLDivElement> & {
		variant?: BadgeVariant;
		class?: string;
	};

	let {
		variant = "default",
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<div class={cn(badgeVariants({ variant }), className)} {...restProps}>
	{@render children?.()}
</div>
