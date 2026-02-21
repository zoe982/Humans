<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/cn.js";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import ChevronRight from "lucide-svelte/icons/chevron-right";

	type Props = CalendarPrimitive.RootProps & { class?: string };
	let { class: className, ...restProps }: Props = $props();
</script>

<CalendarPrimitive.Root
	class={cn("p-3", className)}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		<CalendarPrimitive.Header class="relative flex w-full items-center justify-between">
			<CalendarPrimitive.PrevButton
				class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-glass-hover hover:text-text-primary transition-colors"
			>
				<ChevronLeft class="h-4 w-4" />
			</CalendarPrimitive.PrevButton>
			<CalendarPrimitive.Heading class="text-sm font-medium text-text-primary" />
			<CalendarPrimitive.NextButton
				class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-glass-hover hover:text-text-primary transition-colors"
			>
				<ChevronRight class="h-4 w-4" />
			</CalendarPrimitive.NextButton>
		</CalendarPrimitive.Header>

		{#each months as month}
			<CalendarPrimitive.Grid class="mt-3 w-full border-collapse">
				<CalendarPrimitive.GridHead>
					<CalendarPrimitive.GridRow class="flex">
						{#each weekdays as day}
							<CalendarPrimitive.HeadCell
								class="w-8 text-center text-xs font-normal text-text-muted"
							>
								{day.slice(0, 2)}
							</CalendarPrimitive.HeadCell>
						{/each}
					</CalendarPrimitive.GridRow>
				</CalendarPrimitive.GridHead>
				<CalendarPrimitive.GridBody>
					{#each month.weeks as weekDates}
						<CalendarPrimitive.GridRow class="mt-1 flex">
							{#each weekDates as date}
								<CalendarPrimitive.Cell
									{date}
									month={month.value}
									class="relative p-0 text-center"
								>
									<CalendarPrimitive.Day
										class={cn(
											"inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors",
											"text-text-primary hover:bg-glass-hover",
											"data-[selected]:bg-accent data-[selected]:text-white data-[selected]:hover:bg-accent",
											"data-[today]:ring-1 data-[today]:ring-accent/40",
											"data-[outside-month]:text-text-muted/40 data-[outside-month]:pointer-events-none",
											"data-[disabled]:text-text-muted/30 data-[disabled]:pointer-events-none",
											"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
										)}
									/>
								</CalendarPrimitive.Cell>
							{/each}
						</CalendarPrimitive.GridRow>
					{/each}
				</CalendarPrimitive.GridBody>
			</CalendarPrimitive.Grid>
		{/each}
	{/snippet}
</CalendarPrimitive.Root>
