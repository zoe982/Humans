<script lang="ts">
  import PageHeader from "$lib/components/PageHeader.svelte";
  import { resolve } from "$app/paths";
</script>

<svelte:head>
  <title>Reports - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Reports" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]} />

  <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a href={resolve('/emails')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Emails</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage all email addresses across humans and accounts.</p>
    </a>
    <a href={resolve('/phone-numbers')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Phone Numbers</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage all phone numbers across humans and accounts.</p>
    </a>
    <a href={resolve('/social-ids')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Social Media IDs</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage all social media handles and profiles.</p>
    </a>
    <a href={resolve('/geo-interests')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Geo-Interests</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage geographic interest locations.</p>
    </a>
    <a href={resolve('/route-interests')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Route Interests</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage route interest expressions.</p>
    </a>
    <a href={resolve('/colleagues')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Colleagues</h2>
      <p class="mt-2 text-sm text-text-secondary">View team members and their roles.</p>
    </a>
    <a href={resolve('/referral-codes')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Referral Codes</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage referral codes linked to humans and accounts.</p>
    </a>
    <a href={resolve('/discount-codes')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Discount Codes</h2>
      <p class="mt-2 text-sm text-text-secondary">View discount codes and manage links to humans and accounts.</p>
    </a>
    <a href={resolve('/websites')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Websites</h2>
      <p class="mt-2 text-sm text-text-secondary">View and manage all websites across humans and accounts.</p>
    </a>
    <a href={resolve('/agreements')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Agreements</h2>
      <p class="mt-2 text-sm text-text-secondary">Track contracts and agreements linked to humans and accounts.</p>
    </a>
    <a href={resolve('/marketing-attributions')} class="glass-card p-6 hover:bg-glass-hover transition-colors">
      <h2 class="text-lg font-semibold text-text-primary">Marketing Attributions</h2>
      <p class="mt-2 text-sm text-text-secondary">View marketing attribution data linked to route signups and booking requests.</p>
    </a>
  </div>
</div>
