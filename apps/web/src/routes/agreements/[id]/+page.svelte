<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import GlassDatePicker from "$lib/components/GlassDatePicker.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { onDestroy } from "svelte";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { createChangeHistoryLoader } from "$lib/changeHistory.svelte";
  import { agreementStatusColors } from "$lib/constants/colors";
  import { agreementStatusLabels, AGREEMENT_STATUS_OPTIONS } from "$lib/constants/labels";
  import { api } from "$lib/api";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { resolve } from "$app/paths";
  import { invalidateAll } from "$app/navigation";

  let { data }: { data: PageData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type AccountListItem = { id: string; name: string; displayId: string };
  type ConfigItem = { id: string; name: string };
  type Agreement = {
    id: string;
    displayId: string;
    title: string;
    typeId: string | null;
    typeName: string | null;
    status: string;
    activationDate: string | null;
    notes: string | null;
    humanId: string | null;
    humanName: string | null;
    accountId: string | null;
    accountName: string | null;
  };
  type Document = {
    id: string;
    displayId: string;
    key: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    createdAt: string;
  };

  const agreement = $derived(data.agreement as Agreement);
  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const allAccounts = $derived(data.allAccounts as AccountListItem[]);
  const agreementTypes = $derived(data.agreementTypes as ConfigItem[]);
  const documents = $derived(data.documents as Document[]);

  // Auto-save state
  let title = $state("");
  let typeId = $state("");
  let humanId = $state("");
  let accountId = $state("");
  let activationDate = $state("");
  let notes = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // File upload state
  let uploading = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  // Change history
  const history = createChangeHistoryLoader("agreement", agreement.id);

  $effect(() => {
    if (!history.historyLoaded) {
      void history.loadHistory();
    }
  });

  // Initialize state from data
  $effect(() => {
    title = agreement.title;
    typeId = agreement.typeId ?? "";
    humanId = agreement.humanId ?? "";
    accountId = agreement.accountId ?? "";
    activationDate = agreement.activationDate ?? "";
    notes = agreement.notes ?? "";
    if (!initialized) initialized = true;
  });

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.displayId} ${h.firstName} ${h.lastName}` }))
  );

  const accountOptions = $derived(
    allAccounts.map((a) => ({ value: a.id, label: `${a.displayId} ${a.name}` }))
  );

  const typeOptions = $derived(
    agreementTypes.map((t) => ({ value: t.id, label: t.name }))
  );

  const autoSaver = createAutoSaver({
    endpoint: `/api/agreements/${agreement.id}`,
    onStatusChange: (s) => { saveStatus = s; },
    onSaved: () => {
      toast("Changes saved");
      history.resetHistory();
    },
    onError: (err) => {
      toast(`Save failed: ${err}`);
    },
  });

  onDestroy(() => autoSaver.destroy());

  function buildPayload() {
    return {
      title,
      typeId: typeId || null,
      humanId: humanId || null,
      accountId: accountId || null,
      activationDate: activationDate || null,
      notes: notes || null,
    };
  }

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save(buildPayload());
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate(buildPayload());
  }

  function handleSelectChange(field: "typeId" | "humanId" | "accountId") {
    return (value: string) => {
      if (field === "typeId") typeId = value;
      else if (field === "humanId") humanId = value;
      else accountId = value;
      triggerSaveImmediate();
    };
  }

  function handleDateChange(value: string) {
    activationDate = value;
    triggerSaveImmediate();
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await api(`/api/agreements/${agreement.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast("Status updated");
      await invalidateAll();
    } catch {
      toast("Failed to update status");
    }
  }

  async function handleFileUpload() {
    const file = fileInput?.files?.[0];
    if (file == null) return;

    if (file.type !== "application/pdf") {
      toast("Only PDF files are allowed");
      return;
    }

    uploading = true;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "agreement");
      formData.append("entityId", agreement.id);

      const res = await fetch(`${PUBLIC_API_URL}/api/documents/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        toast("Document uploaded");
        await invalidateAll();
      } else {
        toast("Upload failed");
      }
    } finally {
      uploading = false;
      if (fileInput) fileInput.value = "";
    }
  }

  async function handleDeleteDocument(docId: string) {
    try {
      await api(`/api/documents/${docId}`, { method: "DELETE" });
      toast("Document deleted");
      await invalidateAll();
    } catch {
      toast("Failed to delete document");
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${String(bytes)} B`;
    if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`;
    return `${String((bytes / (1024 * 1024)).toFixed(1))} MB`;
  }
</script>

<svelte:head>
  <title>{agreement.displayId} — {agreement.title} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/agreements"
    backLabel="Agreements"
    title="{agreement.displayId} — {agreement.title}"
    status={agreement.status}
    statusOptions={AGREEMENT_STATUS_OPTIONS.map((o) => o.value)}
    statusColorMap={agreementStatusColors}
    statusLabels={agreementStatusLabels}
    onStatusChange={handleStatusChange}
  />

  <!-- Details Card -->
  <div class="glass-card p-6 mt-4">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label for="title" class="block text-sm font-medium text-text-secondary">Title</label>
        <input
          id="title" type="text"
          bind:value={title}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>

      <div>
        <label for="typeId" class="block text-sm font-medium text-text-secondary">Type</label>
        <SearchableSelect
          options={typeOptions}
          name="typeId"
          id="typeId"
          value={typeId}
          emptyOption="None"
          placeholder="Select type..."
          onSelect={handleSelectChange("typeId")}
        />
      </div>

      <div>
        <label for="human" class="block text-sm font-medium text-text-secondary">Human</label>
        <SearchableSelect
          options={humanOptions}
          name="humanId"
          id="human"
          value={humanId}
          emptyOption="None"
          placeholder="Search humans..."
          onSelect={handleSelectChange("humanId")}
        />
        {#if humanId}
          <a href={resolve(`/humans/${humanId}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
            View Human
          </a>
        {/if}
      </div>

      <div>
        <label for="account" class="block text-sm font-medium text-text-secondary">Account</label>
        <SearchableSelect
          options={accountOptions}
          name="accountId"
          id="account"
          value={accountId}
          emptyOption="None"
          placeholder="Search accounts..."
          onSelect={handleSelectChange("accountId")}
        />
        {#if accountId}
          <a href={resolve(`/accounts/${accountId}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
            View Account
          </a>
        {/if}
      </div>

      <div>
        <label for="activationDate" class="block text-sm font-medium text-text-secondary">Activation Date</label>
        <GlassDatePicker
          id="activationDate"
          name="activationDate"
          value={activationDate}
          onchange={handleDateChange}
        />
      </div>
    </div>
  </div>

  <!-- Notes Card -->
  <div class="glass-card p-6 mt-6">
    <h2 class="text-lg font-semibold text-text-primary mb-3">Notes</h2>
    <textarea
      id="notes" rows={5}
      bind:value={notes}
      oninput={triggerSave}
      class="glass-input block w-full px-3 py-2 text-sm"
      placeholder="Add notes..."
    ></textarea>
  </div>

  <!-- Documents -->
  <div class="mt-6">
    <RelatedListTable
      title="Documents"
      items={documents}
      columns={[
        { key: "filename", label: "Filename", sortable: true, sortValue: (d) => d.filename },
        { key: "size", label: "Size", sortable: true, sortValue: (d) => String(d.sizeBytes) },
        { key: "uploaded", label: "Uploaded", sortable: true, sortValue: (d) => d.createdAt },
        { key: "actions", label: "" },
      ]}
      defaultSortKey="uploaded"
      defaultSortDirection="desc"
      searchFilter={(d, q) => d.filename.toLowerCase().includes(q)}
      emptyMessage="No documents uploaded yet."
      addLabel="Document"
    >
      {#snippet row(doc, _searchQuery)}
        <td class="text-sm font-medium text-text-primary">{doc.filename}</td>
        <td class="text-sm text-text-muted">{formatFileSize(doc.sizeBytes)}</td>
        <td class="text-sm text-text-muted whitespace-nowrap">{formatRelativeTime(doc.createdAt)}</td>
        <td class="text-right space-x-2">
          <a
            href={`${PUBLIC_API_URL}/api/documents/download/${doc.key}`}
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-accent hover:text-[var(--link-hover)]"
          >Download</a>
          <button
            type="button"
            class="text-sm text-red-400 hover:text-red-300"
            onclick={() => handleDeleteDocument(doc.id)}
          >Delete</button>
        </td>
      {/snippet}
      {#snippet addForm()}
        <div class="flex items-center gap-2">
          <input
            type="file"
            accept=".pdf,application/pdf"
            bind:this={fileInput}
            onchange={handleFileUpload}
            class="text-sm text-text-secondary file:mr-2 file:rounded file:border-0 file:bg-glass file:px-3 file:py-1 file:text-sm file:text-text-primary"
            id="file-upload"
          />
          {#if uploading}
            <span class="text-sm text-text-muted">Uploading...</span>
          {/if}
        </div>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Change History -->
  <div class="mt-6">
    <RelatedListTable
      title="Change History"
      items={history.historyEntries}
      columns={[
        { key: "colleague", label: "Colleague", sortable: true, sortValue: (e) => e.colleagueName ?? "" },
        { key: "action", label: "Action", sortable: true, sortValue: (e) => e.action },
        { key: "time", label: "Time", sortable: true, sortValue: (e) => e.createdAt },
        { key: "changes", label: "Changes", sortable: true, sortValue: (e) => summarizeChanges(e.changes) },
      ]}
      defaultSortKey="time"
      defaultSortDirection="desc"
      searchFilter={(e, q) =>
        (e.colleagueName ?? "").toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        summarizeChanges(e.changes).toLowerCase().includes(q)}
      emptyMessage="No changes recorded yet."
    >
      {#snippet row(entry, _searchQuery)}
        <td class="text-sm font-medium text-text-primary">{entry.colleagueName ?? "System"}</td>
        <td>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-secondary">
            {entry.action}
          </span>
        </td>
        <td class="text-sm text-text-muted whitespace-nowrap">{formatRelativeTime(entry.createdAt)}</td>
        <td class="text-xs text-text-secondary max-w-sm truncate">{summarizeChanges(entry.changes)}</td>
      {/snippet}
    </RelatedListTable>
  </div>
</div>
