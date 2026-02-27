import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { fetchObj, fetchList, fetchConfigs } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ email: Record<string, unknown>; humanEmailLabelConfigs: unknown[]; accountEmailLabelConfigs: unknown[]; allHumans: unknown[]; allAccounts: unknown[]; allGeneralLeads: unknown[]; allBookingRequests: unknown[]; allRouteSignups: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";

  const email = await fetchObj(`${PUBLIC_API_URL}/api/emails/${id}`, sessionToken);
  if (email == null) redirect(302, "/emails");

  // Batch 1 (4 concurrent — Cloudflare Workers limit: 6 TCP, auth uses 1, safety margin 1)
  const [configs, allHumans, allAccounts, allGeneralLeads] = await Promise.all([
    fetchConfigs(sessionToken, ["human-email-labels", "account-email-labels"]),
    fetchList(`${PUBLIC_API_URL}/api/humans`, sessionToken),
    fetchList(`${PUBLIC_API_URL}/api/accounts`, sessionToken),
    fetchList(`${PUBLIC_API_URL}/api/general-leads`, sessionToken),
  ]);

  // Batch 2 (2 concurrent — batch 1 connections already released)
  const [allBookingRequests, allRouteSignups] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/website-booking-requests?limit=500`, sessionToken),
    fetchList(`${PUBLIC_API_URL}/api/route-signups?limit=500`, sessionToken),
  ]);

  return {
    email,
    humanEmailLabelConfigs: configs["human-email-labels"] ?? [],
    accountEmailLabelConfigs: configs["account-email-labels"] ?? [],
    allHumans,
    allAccounts,
    allGeneralLeads,
    allBookingRequests,
    allRouteSignups,
  };
};
