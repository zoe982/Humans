<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";

  type Props = {
    title: string;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    action?: Snippet;
  };

  let { title, breadcrumbs = [], action }: Props = $props();
</script>

<div class="mb-6">
  {#if breadcrumbs.length > 0}
    <Breadcrumb.Root aria-label="Breadcrumb" class="mb-2">
      <Breadcrumb.List class="flex items-center gap-2 text-sm text-text-muted">
        {#each breadcrumbs as crumb, i}
          {#if i > 0}
            <Breadcrumb.Separator />
          {/if}
          <Breadcrumb.Item>
            {#if crumb.href}
              <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
            {:else}
              <Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
            {/if}
          </Breadcrumb.Item>
        {/each}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  {/if}
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-text-primary">{title}</h1>
    {#if action}
      {@render action()}
    {/if}
  </div>
</div>
