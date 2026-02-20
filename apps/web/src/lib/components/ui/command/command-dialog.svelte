<script lang="ts">
	import { Command as CommandPrimitive, Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		class?: string;
		children?: import("svelte").Snippet;
	};

	let {
		open = $bindable(false),
		onOpenChange,
		class: className,
		children,
	}: Props = $props();
</script>

<DialogPrimitive.Root bind:open {onOpenChange}>
	<DialogPrimitive.Portal>
		<DialogPrimitive.Overlay class="fixed inset-0 z-50 bg-black/50" />
		<DialogPrimitive.Content
			class={cn(
				"fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 glass-card-strong overflow-hidden p-0 shadow-lg",
				className,
			)}
		>
			<CommandPrimitive.Root class="flex h-full w-full flex-col overflow-hidden">
				{@render children?.()}
			</CommandPrimitive.Root>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
