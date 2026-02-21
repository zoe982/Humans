<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";
	import type { AlertVariant } from "./index.js";

	type Props = HTMLAttributes<HTMLDivElement> & {
		variant?: AlertVariant;
		class?: string;
	};

	let {
		variant = "default",
		class: className,
		children,
		...restProps
	}: Props = $props();

	const variantClasses: Record<AlertVariant, string> = {
		default: "glass-card p-4 text-text-primary",
		destructive: "bg-danger border border-danger-border rounded-[1rem] p-4 text-destructive-foreground",
	};
</script>

<div
	role="alert"
	class={cn(variantClasses[variant], className)}
	{...restProps}
>
	{@render children?.()}
</div>
