<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/cn.js";

	type Props = HTMLAttributes<HTMLDivElement> & { class?: string };
	let { class: className, ...restProps }: Props = $props();
</script>

<div class={cn("skeleton", className)} {...restProps}></div>
