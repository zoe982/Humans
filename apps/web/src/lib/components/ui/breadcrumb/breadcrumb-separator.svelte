<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import ChevronRight from "lucide-svelte/icons/chevron-right";

	type Props = HTMLAttributes<HTMLLIElement> & {
		class?: string;
		children?: import("svelte").Snippet;
	};

	let { children, ...restProps }: Props = $props();
</script>

<li role="presentation" aria-hidden="true" {...restProps}>
	{#if children}
		{@render children()}
	{:else}
		<ChevronRight class="h-3.5 w-3.5" />
	{/if}
</li>
