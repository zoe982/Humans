<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import { Button } from "$lib/components/ui/button";
  import { enhance } from "$app/forms";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type ConfigItem = { id: string; name: string; createdAt: string };

  const accountTypes = $derived(data.accountTypes as ConfigItem[]);
  const humanLabels = $derived(data.humanLabels as ConfigItem[]);
  const emailLabels = $derived(data.emailLabels as ConfigItem[]);
  const phoneLabels = $derived(data.phoneLabels as ConfigItem[]);
  const humanEmailLabels = $derived(data.humanEmailLabels as ConfigItem[]);
  const humanPhoneLabels = $derived(data.humanPhoneLabels as ConfigItem[]);
  const opportunityHumanRoles = $derived(data.opportunityHumanRoles as ConfigItem[]);
  const humanRelationshipLabels = $derived(data.humanRelationshipLabels as ConfigItem[]);
  const agreementTypes = $derived(data.agreementTypes as ConfigItem[]);
  const leadSources = $derived(data.leadSources as ConfigItem[]);
  const leadChannels = $derived(data.leadChannels as ConfigItem[]);

  let editingId: string | null = $state(null);
  let editingName: string = $state("");

  function startEdit(item: ConfigItem) {
    editingId = item.id;
    editingName = item.name;
  }

  function cancelEdit() {
    editingId = null;
    editingName = "";
  }
</script>

<svelte:head>
  <title>Labels & Configuration - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Labels & Configuration"
    breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Label Configuration" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}
  {#if form?.success}
    <AlertBanner type="success" message="Saved successfully." />
  {/if}

  <div class="mt-8 grid gap-6 sm:grid-cols-2">
    <!-- Account Types -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Account Types</h2>
      {#if accountTypes.length === 0}
        <p class="text-text-muted text-sm mb-4">No account types yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each accountTypes as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameAccountType" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteAccountType">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createAccountType" class="flex gap-2">
        <input name="name" type="text" required placeholder="New account type..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Human-Account Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Human-Account Role Labels</h2>
      {#if humanLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No role labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each humanLabels as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameHumanLabel" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteHumanLabel">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createHumanLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New role label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Email Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Account Email Labels</h2>
      {#if emailLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No email labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each emailLabels as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameEmailLabel" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteEmailLabel">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createEmailLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New email label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Phone Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Account Phone Labels</h2>
      {#if phoneLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No phone labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each phoneLabels as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renamePhoneLabel" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deletePhoneLabel">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createPhoneLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New phone label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Human Email Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Human Email Labels</h2>
      {#if humanEmailLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No human email labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each humanEmailLabels as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameHumanEmailLabel" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteHumanEmailLabel">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createHumanEmailLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New email label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Human Phone Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Human Phone Labels</h2>
      {#if humanPhoneLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No human phone labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each humanPhoneLabels as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameHumanPhoneLabel" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteHumanPhoneLabel">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createHumanPhoneLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New phone label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Opportunity Human Roles -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Opportunity Human Roles</h2>
      {#if opportunityHumanRoles.length === 0}
        <p class="text-text-muted text-sm mb-4">No opportunity human roles yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each opportunityHumanRoles as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameOpportunityHumanRole" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteOpportunityHumanRole">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createOpportunityHumanRole" class="flex gap-2">
        <input name="name" type="text" required placeholder="New role name..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Agreement Types -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Agreement Types</h2>
      {#if agreementTypes.length === 0}
        <p class="text-text-muted text-sm mb-4">No agreement types yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each agreementTypes as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameAgreementType" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteAgreementType">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createAgreementType" class="flex gap-2">
        <input name="name" type="text" required placeholder="New agreement type..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Human Relationship Labels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Human Relationship Labels</h2>
      {#if humanRelationshipLabels.length === 0}
        <p class="text-text-muted text-sm mb-4">No relationship labels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each humanRelationshipLabels as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameHumanRelationshipLabel" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteHumanRelationshipLabel">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createHumanRelationshipLabel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New relationship label..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Lead Sources -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Lead Sources</h2>
      {#if leadSources.length === 0}
        <p class="text-text-muted text-sm mb-4">No lead sources yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each leadSources as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameLeadSource" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteLeadSource">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createLeadSource" class="flex gap-2">
        <input name="name" type="text" required placeholder="New lead source..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>

    <!-- Lead Channels -->
    <div class="glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Lead Channels</h2>
      {#if leadChannels.length === 0}
        <p class="text-text-muted text-sm mb-4">No lead channels yet.</p>
      {:else}
        <div class="space-y-2 mb-4">
          {#each leadChannels as item, i (i)}
            <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
              {#if editingId === item.id}
                <form method="POST" action="?/renameLeadChannel" use:enhance={() => { return async ({ update }) => { cancelEdit(); await update(); }; }} class="flex items-center gap-2 flex-1 mr-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    type="text"
                    required
                    bind:value={editingName}
                    class="glass-input flex-1 px-2 py-1 text-sm"
                    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <button type="submit" class="text-accent hover:opacity-80 text-sm">Save</button>
                  <button type="button" onclick={cancelEdit} class="text-text-muted hover:opacity-80 text-sm">Cancel</button>
                </form>
              {:else}
                <button type="button" onclick={() => startEdit(item)} class="text-sm text-text-primary hover:text-accent transition-colors text-left flex-1 mr-2" title="Click to edit">
                  {item.name}
                </button>
                <form method="POST" action="?/deleteLeadChannel">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" class="text-destructive-foreground hover:opacity-80 text-sm">Remove</button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <form method="POST" action="?/createLeadChannel" class="flex gap-2">
        <input name="name" type="text" required placeholder="New lead channel..." class="glass-input flex-1 px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Add</Button>
      </form>
    </div>
  </div>
</div>
