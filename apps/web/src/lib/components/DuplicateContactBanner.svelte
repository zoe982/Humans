<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { Root as Alert } from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button";
  import { api } from "$lib/api";
  import { resolve } from "$app/paths";

  type OwnerInfo = { type: string; id: string; displayId: string; name: string };
  type DuplicateDetails = {
    existingId: string;
    existingDisplayId: string;
    existingOwners: OwnerInfo[];
  };

  type Props = {
    details: DuplicateDetails;
    entityType: "emails" | "phone-numbers" | "social-ids" | "websites";
    parentType: string;
    parentId: string;
    parentField: string;
  };

  let { details, entityType, parentType: _parentType, parentId, parentField }: Props = $props();
  let linking = $state(false);

  const ownerSummary = $derived(
    details.existingOwners
      .map((o) => `${o.name} / ${o.displayId}`)
      .join(", ") || "unlinked",
  );

  const entityLabel = $derived(
    entityType === "emails" ? "email" :
    entityType === "phone-numbers" ? "phone number" :
    entityType === "social-ids" ? "social ID" :
    "website"
  );

  const ownerLinkPath = $derived(
    details.existingOwners.length > 0
      ? (() => {
          const o = details.existingOwners[0]!;
          const base = o.type === "human" ? "/humans" :
                       o.type === "account" ? "/accounts" :
                       o.type === "generalLead" ? "/leads/general-leads" : null;
          return base ? `${base}/${o.id}` : null;
        })()
      : null,
  );

  async function linkExisting() {
    linking = true;
    try {
      await api(`/api/${entityType}/${details.existingId}`, {
        method: "PATCH",
        body: JSON.stringify({ [parentField]: parentId }),
      });
      await invalidateAll();
    } finally {
      linking = false;
    }
  }
</script>

<Alert variant="default" class="mb-4 border-warning-border bg-warning-bg text-warning">
  <p>
    This {entityLabel} already exists as
    <span class="font-mono font-semibold">{details.existingDisplayId}</span>
    (linked to {ownerSummary}).
  </p>
  <div class="mt-2 flex items-center gap-3">
    <Button size="sm" variant="outline" onclick={linkExisting} disabled={linking}>
      {linking ? "Linking..." : "Link Existing"}
    </Button>
    {#if ownerLinkPath}
      <a href={resolve(ownerLinkPath)} class="text-xs text-accent hover:underline">View owner</a>
    {/if}
  </div>
</Alert>
