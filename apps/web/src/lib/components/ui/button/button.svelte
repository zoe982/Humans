<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";
	import { buttonVariants, type ButtonVariant, type ButtonSize } from "./index.js";

	type Props = HTMLButtonAttributes & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
	};

	let {
		variant = "default",
		size = "default",
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<button
	class={cn(buttonVariants({ variant, size }), className)}
	{...restProps}
>
	{@render children?.()}
</button>
