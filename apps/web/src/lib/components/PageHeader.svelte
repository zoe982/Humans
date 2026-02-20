<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    action?: Snippet;
  };

  let { title, breadcrumbs = [], action }: Props = $props();
</script>

<div class="mb-6">
  {#if breadcrumbs.length > 0}
    <nav aria-label="Breadcrumb" class="mb-2">
      <ol class="flex items-center gap-2 text-sm text-text-muted">
        {#each breadcrumbs as crumb, i}
          {#if i > 0}
            <li aria-hidden="true">/</li>
          {/if}
          <li>
            {#if crumb.href}
              <a href={crumb.href} class="hover:text-accent">{crumb.label}</a>
            {:else}
              <span class="text-text-secondary" aria-current="page">{crumb.label}</span>
            {/if}
          </li>
        {/each}
      </ol>
    </nav>
  {/if}
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-text-primary">{title}</h1>
    {#if action}
      {@render action()}
    {/if}
  </div>
</div>
