<script lang="ts">
	import { Button } from "$lib/components/ui/button";

	interface LossReason {
		id: string;
		name: string;
	}

	interface Props {
		lossReason: string | null;
		lossNotes: string | null;
		lossReasons: LossReason[];
		saving: boolean;
		onSave: (lossReason: string | null, lossNotes: string | null) => void;
	}

	let { lossReason, lossNotes, lossReasons, saving, onSave }: Props = $props();

	// Use a stable per-instance suffix to avoid ID collisions when multiple
	// LossDetailsCard instances appear on the same page.
	const instanceId = Math.random().toString(36).slice(2, 8);
	const reasonId = `lossReason-${instanceId}`;
	const notesId = `lossNotes-${instanceId}`;

	let editLossReason = $state("");
	let editLossNotes = $state("");

	// Sync local state whenever the parent provides updated prop values.
	$effect(() => {
		editLossReason = lossReason ?? "";
		editLossNotes = lossNotes ?? "";
	});

	function handleSave() {
		onSave(editLossReason || null, editLossNotes || null);
	}
</script>

<div class="glass-card p-6 mb-6">
	<h2 class="text-lg font-semibold text-text-primary mb-4">Loss Details</h2>
	<div class="space-y-3">
		<div>
			<label for={reasonId} class="block text-sm font-medium text-text-secondary mb-1">
				Loss Reason
			</label>
			<select id={reasonId} class="glass-input block w-full px-3 py-2 text-sm" bind:value={editLossReason}>
				<option value="">-- Select --</option>
				{#each lossReasons as reason, i (i)}
					<option value={reason.name}>{reason.name}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for={notesId} class="block text-sm font-medium text-text-secondary mb-1">
				Loss Notes
			</label>
			<textarea
				id={notesId}
				bind:value={editLossNotes}
				rows="3"
				class="glass-input block w-full px-3 py-2 text-sm"
				placeholder="Loss notes..."
			></textarea>
		</div>
		<div class="flex justify-end">
			<Button size="sm" onclick={handleSave} disabled={saving}>
				{saving ? "Saving..." : "Save"}
			</Button>
		</div>
	</div>
</div>
