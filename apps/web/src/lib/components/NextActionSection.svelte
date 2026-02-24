<script lang="ts">
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import ConfettiOverlay from "$lib/components/ConfettiOverlay.svelte";
  import { toast } from "svelte-sonner";
  import { CheckCircle, Check, Pencil, Clock } from "lucide-svelte";
  import * as Select from "$lib/components/ui/select";
  import GlassDatePicker from "$lib/components/GlassDatePicker.svelte";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { api } from "$lib/api";
  import { ACTIVITY_TYPE_OPTIONS, activityTypeLabels } from "$lib/constants/labels";
  import { formatDate } from "$lib/utils/format";
  import { onDestroy } from "svelte";
  import { Button } from "$lib/components/ui/button";

  type Option = { value: string; label: string };
  type NextAction = {
    id: string;
    ownerId: string | null;
    description: string | null;
    type: string | null;
    dueDate: string | null;
    cadenceNote: string | null;
  };
  type CadenceHint = { displayText: string; cadenceHours: number };

  interface Props {
    apiEndpoint: string;
    colleagueOptions: Option[];
    currentColleagueId: string;
    nextAction: NextAction | null;
    cadenceHint?: CadenceHint | null;
    stageLabel?: string;
    warnWhenEmpty?: boolean;
  }

  let {
    apiEndpoint,
    colleagueOptions,
    currentColleagueId,
    nextAction,
    cadenceHint = null,
    stageLabel = "",
    warnWhenEmpty = false,
  }: Props = $props();

  let naOwnerId = $state("");
  let naDescription = $state("");
  let naType = $state("email");
  let naDueDate = $state("");
  let naCadenceNote = $state("");
  let naSaveStatus = $state<SaveStatus>("idle");
  let naLocked = $state(false);
  let showConfetti = $state(false);

  const cadenceWarning = $derived(() => {
    if (!cadenceHint || !naDueDate) return false;
    const now = Date.now();
    const due = new Date(naDueDate).getTime();
    const spanMs = due - now;
    return spanMs > cadenceHint.cadenceHours * 1.5 * 3600_000;
  });

  const naAllFilled = $derived(
    Boolean(naOwnerId && naDescription && naType && naDueDate) &&
    (!cadenceWarning() || Boolean(naCadenceNote.trim()))
  );

  // Initialize from props
  function init() {
    const na = nextAction;
    naOwnerId = na?.ownerId ?? currentColleagueId ?? "";
    naDescription = na?.description ?? "";
    naType = na?.type ?? "email";
    naDueDate = na?.dueDate ?? "";
    naCadenceNote = na?.cadenceNote ?? "";
    naLocked = Boolean(na?.description && na?.dueDate);
  }

  init();

  const naAutoSaver = createAutoSaver({
    endpoint: apiEndpoint,
    onStatusChange: (s) => { naSaveStatus = s; },
    onSaved: () => {
      toast("Next action saved");
      naLocked = true;
    },
    onError: (err) => { toast(`Next action save failed: ${err}`); },
  });

  onDestroy(() => { naAutoSaver.destroy(); });

  function triggerNaSave() {
    if (!naOwnerId || !naDescription || !naType || !naDueDate) return;
    if (cadenceWarning() && !naCadenceNote.trim()) return;
    naAutoSaver.save({
      ownerId: naOwnerId,
      description: naDescription,
      type: naType,
      dueDate: naDueDate,
      cadenceNote: cadenceWarning() ? naCadenceNote : null,
    });
  }

  async function handleComplete() {
    showConfetti = true;
    setTimeout(() => { showConfetti = false; }, 2000);
    naOwnerId = currentColleagueId ?? "";
    naDescription = "";
    naType = "email";
    naDueDate = "";
    naCadenceNote = "";
    naSaveStatus = "idle";
    naLocked = false;
    try {
      await api(`${apiEndpoint}/done`, { method: "POST" });
    } catch { /* fields already cleared locally */ }
  }

  function unlockNextAction() {
    naLocked = false;
  }
</script>

<ConfettiOverlay active={showConfetti} />

<div class="mt-6 {naLocked ? 'glass-card-locked' : 'glass-card-hero'} p-8 space-y-4 transition-all duration-300">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-bold text-text-primary">Next Action</h2>
      {#if !naLocked}
        <SaveIndicator status={naSaveStatus} />
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if naLocked}
        <Button onclick={unlockNextAction} variant="outline" size="sm">
          <Pencil size={14} class="mr-1.5" />
          Edit
        </Button>
        <Button onclick={handleComplete} class="bg-emerald-600 hover:bg-emerald-500 text-white">
          <CheckCircle size={18} class="mr-1.5" />
          Done
        </Button>
      {:else if naDescription}
        <Button onclick={handleComplete} class="bg-emerald-600 hover:bg-emerald-500 text-white" size="sm">
          <CheckCircle size={18} class="mr-1.5" />
          Done
        </Button>
      {/if}
    </div>
  </div>

  {#if cadenceHint && stageLabel}
    <p class="text-sm text-text-muted">
      Recommended for <span class="font-medium text-text-secondary">{stageLabel}</span> stage: {cadenceHint.displayText}
    </p>
  {:else}
    <p class="text-sm text-text-muted">
      A next action is the single most important step to keep this moving forward.
    </p>
  {/if}
  {#if warnWhenEmpty && !naLocked && !naAllFilled}
    <p class="text-sm text-amber-400 font-medium">Please set a next action so you don't lose track of this lead.</p>
  {/if}

  {#if naLocked}
    <!-- Locked: read-only display -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div>
        <span class="block text-xs font-medium text-text-muted uppercase tracking-wide">Owner</span>
        <p class="mt-1 text-sm text-text-primary">{colleagueOptions.find((c) => c.value === naOwnerId)?.label ?? "\u2014"}</p>
      </div>
      <div>
        <span class="block text-xs font-medium text-text-muted uppercase tracking-wide">Type</span>
        <p class="mt-1 text-sm text-text-primary">{activityTypeLabels[naType] ?? naType}</p>
      </div>
      <div>
        <span class="block text-xs font-medium text-text-muted uppercase tracking-wide">Due Date</span>
        <p class="mt-1 text-sm text-text-primary">{naDueDate ? formatDate(naDueDate) : "\u2014"}</p>
      </div>
      <div class="sm:col-span-3">
        <span class="block text-xs font-medium text-text-muted uppercase tracking-wide">Description</span>
        <p class="mt-1 text-sm text-text-primary whitespace-pre-wrap">{naDescription}</p>
      </div>
      {#if naCadenceNote}
        <div class="sm:col-span-3">
          <div class="cadence-deviation-note">
            <span class="flex items-center gap-1 text-xs font-medium uppercase tracking-wider mb-1"
                  style="color: rgba(245,158,11,0.70)">
              <Clock size={12} class="opacity-60" /> Cadence Note
            </span>
            <p class="text-sm text-text-secondary whitespace-pre-wrap">{naCadenceNote}</p>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Unlocked: editable form -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div>
        <label for="naOwner" class="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
          Owner
          {#if naOwnerId}
            <Check size={14} class="text-emerald-500" />
          {/if}
        </label>
        <SearchableSelect
          options={colleagueOptions}
          name="naOwner"
          id="naOwner"
          value={naOwnerId}
          emptyOption="Select owner..."
          placeholder="Search colleagues..."
          onSelect={(value) => { naOwnerId = value; triggerNaSave(); }}
        />
      </div>
      <div>
        <label for="naType" class="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
          Type
          {#if naType}
            <Check size={14} class="text-emerald-500" />
          {/if}
        </label>
        <input type="hidden" name="naType" value={naType} />
        <Select.Root type="single" value={naType} onValueChange={(v) => { if (v) { naType = v; triggerNaSave(); } }}>
          <Select.Trigger>
            {activityTypeLabels[naType] ?? "Select type..."}
          </Select.Trigger>
          <Select.Content>
            {#each ACTIVITY_TYPE_OPTIONS as opt}
              <Select.Item value={opt.value}>{opt.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div>
        <label for="naDueDate" class="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
          Due Date <span class="text-red-400">*</span>
          {#if naDueDate}
            <Check size={14} class="text-emerald-500" />
          {/if}
        </label>
        <GlassDatePicker
          name="naDueDate"
          id="naDueDate"
          value={naDueDate}
          onchange={(v) => { naDueDate = v; triggerNaSave(); }}
        />
        {#if cadenceWarning()}
          <p class="mt-1 text-xs text-amber-500">Due date exceeds the recommended cadence for this stage.</p>
        {/if}
      </div>
    </div>
    {#if cadenceWarning()}
      <div class="cadence-deviation-field" role="region" aria-label="Cadence deviation explanation required">
        <label for="naCadenceNote" class="flex items-center gap-1.5 text-sm font-medium text-amber-400">
          Reason for extended cadence <span class="text-red-400">*</span>
          {#if naCadenceNote.trim()}
            <Check size={14} class="text-emerald-500" />
          {/if}
        </label>
        {#if cadenceHint && stageLabel}
          <p class="text-xs text-text-muted mb-2">
            This date is beyond the recommended {cadenceHint.displayText} for the
            <span class="text-text-secondary font-medium">{stageLabel}</span> stage.
          </p>
        {/if}
        <textarea id="naCadenceNote" rows="2" bind:value={naCadenceNote}
          oninput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; triggerNaSave(); }}
          class="glass-input block w-full resize-none {naCadenceNote.trim() ? 'ring-1 ring-emerald-500/30 border-emerald-500/30' : ''}"
          placeholder="e.g. Client requested more time to review the proposal, follow-up scheduled for their return from travel"
          aria-required="true"
        ></textarea>
      </div>
    {/if}
    <div>
      <label for="naDescription" class="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
        Description <span class="text-red-400">*</span>
        {#if naDescription}
          <Check size={14} class="text-emerald-500" />
        {/if}
      </label>
      <textarea
        id="naDescription" rows="3"
        bind:value={naDescription}
        oninput={(e) => { const target = e.currentTarget; target.style.height = "auto"; target.style.height = target.scrollHeight + "px"; triggerNaSave(); }}
        class="glass-input mt-1 block w-full resize-none {naDescription ? 'ring-1 ring-emerald-500/30 border-emerald-500/30' : ''}"
        placeholder="What needs to happen next?"
      ></textarea>
    </div>
  {/if}
</div>
