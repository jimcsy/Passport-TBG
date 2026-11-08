"use server";

import { getAdminSession } from "@/lib/auth/session";
import { getCohortProgressHeatmap, getHubInsights } from "@/lib/db/repositories/dashboard";

export async function getHubDashboardDataAction() {
  if (!await getAdminSession()) throw new Error("Unauthorized session");
  return getCohortProgressHeatmap();
}

export async function getHubInsightsAction() {
  if (!await getAdminSession()) throw new Error("Unauthorized session");
  return getHubInsights();
}
