<script lang="ts">
  import SkeletonRow from "./SkeletonRow.svelte";

  type Props = { columns?: number };
  let { columns }: Props = $props();
</script>

<table>
  <tbody>
    <SkeletonRow {columns} />
  </tbody>
</table>
