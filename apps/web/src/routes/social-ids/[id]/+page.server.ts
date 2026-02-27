import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { fetchObj, fetchList, fetchConfigs } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ socialId: Record<string, unknown>; platformConfigs: unknown[]; allHumans: unknown[]; allAccounts: unknown[]; allGeneralLeads: unknown[]; allBookingRequests: unknown[]; allRouteSignups: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";

  const socialId = await fetchObj(`${PUBLIC_API_URL}/api/social-ids/${id}`, sessionToken);
  if (socialId == null) redirect(302, "/social-ids");

  // Batch 1 (4 concurrent — Cloudflare Workers limit: 6 TCP, auth uses 1, safety margin 1)
  const [configs, allHumans, allAccounts, allGeneralLeads] = await Promise.all([
    fetchConfigs(sessionToken, ["social-id-platforms"]),
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
    socialId,
    platformConfigs: configs["social-id-platforms"] ?? [],
    allHumans,
    allAccounts,
    allGeneralLeads,
    allBookingRequests,
    allRouteSignups,
  };
};
