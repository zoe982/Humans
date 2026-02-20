<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";

  let { data }: { data: PageData } = $props();

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

  let search = $state("");

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pets;
    return pets.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.ownerName?.toLowerCase().includes(q)) ||
      (p.ownerDisplayId?.toLowerCase().includes(q)) ||
      (p.breed?.toLowerCase().includes(q)) ||
      p.displayId.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    );
  });

  const typeColors: Record<string, string> = {
    dog: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    cat: "bg-[rgba(168,85,247,0.15)] text-purple-300",
  };
</script>

<svelte:head>
  <title>Pets - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Pets" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pets" }]} />

  <div class="mb-4">
    <input
      type="text"
      placeholder="Search pets, owners, breeds..."
      bind:value={search}
      class="glass-input w-full px-3 py-2 text-sm sm:max-w-sm"
    />
  </div>

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>ID</th>
          <th>Owner</th>
          <th>Name</th>
          <th>Type</th>
          <th>Breed</th>
          <th>Weight</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as pet (pet.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm"><a href="/pets/{pet.id}" class="text-accent hover:text-cyan-300">{pet.displayId}</a></td>
            <td class="font-medium">
              {#if pet.humanId}
                <a href="/humans/{pet.humanId}" class="text-accent hover:text-cyan-300">{pet.ownerName ?? "—"}</a>
                {#if pet.ownerDisplayId}
                  <span class="ml-1 text-xs text-text-muted">{pet.ownerDisplayId}</span>
                {/if}
              {:else}
                <span class="text-text-muted">—</span>
              {/if}
            </td>
            <td>{pet.name}</td>
            <td>
              <span class="glass-badge {typeColors[pet.type] ?? 'bg-glass text-text-secondary'}">{pet.type === "dog" ? "Dog" : "Cat"}</span>
            </td>
            <td>{pet.type === "cat" ? "—" : (pet.breed ?? "—")}</td>
            <td class="text-text-muted">{pet.weight ? `${pet.weight} kg` : "—"}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="px-6 py-8 text-center text-sm text-text-muted">{search ? "No matching pets." : "No pets found."}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
