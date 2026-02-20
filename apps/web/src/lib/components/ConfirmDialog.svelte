<script lang="ts">
  import { AlertTriangle } from "lucide-svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

  type Props = {
    open: boolean;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  };

  let { open, message, confirmLabel = "Delete", onConfirm, onCancel }: Props = $props();
</script>

<AlertDialog.Root
  {open}
  onOpenChange={(isOpen) => {
    if (!isOpen) onCancel();
  }}
>
  <AlertDialog.Content class="max-w-sm">
    <AlertDialog.Header>
      <div class="flex items-start gap-3">
        <div class="rounded-lg bg-danger p-2 text-red-400 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <AlertDialog.Title>Confirm Action</AlertDialog.Title>
          <AlertDialog.Description>{message}</AlertDialog.Description>
        </div>
      </div>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={onCancel}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action class="btn-danger text-sm" onclick={onConfirm}>
        {confirmLabel}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
