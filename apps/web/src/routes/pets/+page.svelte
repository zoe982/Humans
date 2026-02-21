<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Pet = {
    id: string;
    displayId: string;
    humanId: string | null;
    type: string;
    name: string;
    breed: string | null;
    weight: number | null;
    ownerName: string | null;
    ownerDisplayId: string | null;
  };

  const pets = $derived(data.pets as Pet[]);

  const typeColors: Record<string, string> = {
    dog: "badge-blue",
    cat: "badge-purple",
  };
</script>

<EntityListPage
  title="Pets"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pets" }]}
  newHref="/pets/new"
  newLabel="Add Pet"
  items={pets}
  error={form?.error}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "owner", label: "Owner" },
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    { key: "breed", label: "Breed" },
    { key: "weight", label: "Weight" },
  ]}
  searchFilter={(p, q) =>
    p.name.toLowerCase().includes(q) ||
    (p.ownerName?.toLowerCase().includes(q) ?? false) ||
    (p.ownerDisplayId?.toLowerCase().includes(q) ?? false) ||
    (p.breed?.toLowerCase().includes(q) ?? false) ||
    p.displayId.toLowerCase().includes(q) ||
    p.type.toLowerCase().includes(q)
  }
  searchPlaceholder="Search pets, owners, breeds..."
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this pet? This cannot be undone."
  canDelete={data.userRole === "admin"}
  emptyMessage={pets.length === 0 ? "No pets found." : "No matching pets."}
>
  {#snippet desktopRow(pet)}
    <td class="font-mono text-sm"><a href="/pets/{pet.id}" class="text-accent hover:text-[var(--link-hover)]">{pet.displayId}</a></td>
    <td class="font-medium">
      {#if pet.humanId}
        <a href="/humans/{pet.humanId}" class="text-accent hover:text-[var(--link-hover)]">{pet.ownerName ?? "\u2014"}</a>
        {#if pet.ownerDisplayId}
          <span class="ml-1 text-xs text-text-muted">{pet.ownerDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">\u2014</span>
      {/if}
    </td>
    <td>{pet.name}</td>
    <td>
      <span class="glass-badge {typeColors[pet.type] ?? 'bg-glass text-text-secondary'}">{pet.type === "dog" ? "Dog" : "Cat"}</span>
    </td>
    <td>{pet.type === "cat" ? "\u2014" : (pet.breed ?? "\u2014")}</td>
    <td class="text-text-muted">{pet.weight ? `${pet.weight} kg` : "\u2014"}</td>
  {/snippet}
  {#snippet mobileCard(pet)}
    <a href="/pets/{pet.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{pet.displayId}</span>
      <div class="font-medium text-accent">{pet.name}</div>
      <div class="text-sm text-text-secondary">
        <span class="glass-badge text-xs {typeColors[pet.type] ?? 'bg-glass text-text-secondary'}">{pet.type === "dog" ? "Dog" : "Cat"}</span>
        {#if pet.ownerName}
          <span class="ml-2">{pet.ownerName}</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
