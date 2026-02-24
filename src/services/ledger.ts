/**
 * Regen Ledger REST API client
 *
 * Queries credit classes, projects, batches, and sell orders
 * from the Regen Network blockchain via Cosmos SDK LCD endpoints.
 *
 * All list endpoints use auto-pagination to fetch complete result sets.
 * Cosmos SDK defaults to 100 items per page; without pagination handling,
 * results are silently truncated.
 */

import { loadConfig } from "../config.js";

function getLcdUrl(): string {
  return loadConfig().lcdUrl;
}

export interface CreditClass {
  id: string;
  admin: string;
  metadata: string;
  credit_type_abbrev: string;
}

export interface Project {
  id: string;
  class_id: string;
  jurisdiction: string;
  metadata: string;
  reference_id: string;
}

export interface CreditBatch {
  denom: string;
  project_id: string;
  issuer: string;
  start_date: string;
  end_date: string;
  issuance_date: string;
  metadata: string;
}

export interface SellOrder {
  id: string;
  seller: string;
  batch_denom: string;
  quantity: string;
  ask_denom: string;
  ask_amount: string;
  disable_auto_retire: boolean;
  expiration: string | null;
}

export interface AllowedDenom {
  bank_denom: string;
  display_denom: string;
  exponent: number;
}

/** Cosmos SDK pagination envelope returned by LCD endpoints. */
interface CosmosPageResponse {
  next_key: string | null;
  total: string;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${getLcdUrl()}${path}`);
  if (!response.ok) {
    throw new Error(
      `Regen Ledger API error: ${response.status} ${response.statusText}`
    );
  }
  return response.json() as Promise<T>;
}

/**
 * Fetch all pages from a paginated Cosmos SDK LCD endpoint.
 *
 * The Cosmos SDK returns a `pagination.next_key` field when more pages
 * are available. We follow the chain until `next_key` is null/empty.
 *
 * @param basePath  API path without query string (e.g. "/regen/ecocredit/v1/classes")
 * @param itemsKey  The JSON key containing the array of items (e.g. "classes")
 * @returns Complete array of items across all pages
 */
async function fetchAllPages<T>(basePath: string, itemsKey: string): Promise<T[]> {
  const allItems: T[] = [];
  let nextKey: string | null = null;

  do {
    const separator = basePath.includes("?") ? "&" : "?";
    const paginationParam = nextKey
      ? `${separator}pagination.key=${encodeURIComponent(nextKey)}`
      : "";
    const path = `${basePath}${paginationParam}`;

    const data = await fetchJSON<Record<string, unknown>>(path);
    const items = data[itemsKey];
    if (Array.isArray(items)) {
      allItems.push(...(items as T[]));
    }

    const pagination = data.pagination as CosmosPageResponse | undefined;
    nextKey = pagination?.next_key || null;
  } while (nextKey);

  return allItems;
}

export async function listCreditClasses(): Promise<CreditClass[]> {
  return fetchAllPages<CreditClass>(
    "/regen/ecocredit/v1/classes",
    "classes"
  );
}

export async function listProjects(classId?: string): Promise<Project[]> {
  const path = classId
    ? `/regen/ecocredit/v1/projects-by-class/${classId}`
    : "/regen/ecocredit/v1/projects";
  return fetchAllPages<Project>(path, "projects");
}

export async function listBatches(projectId?: string): Promise<CreditBatch[]> {
  const path = projectId
    ? `/regen/ecocredit/v1/batches-by-project/${projectId}`
    : "/regen/ecocredit/v1/batches";
  return fetchAllPages<CreditBatch>(path, "batches");
}

export async function listSellOrders(): Promise<SellOrder[]> {
  return fetchAllPages<SellOrder>(
    "/regen/ecocredit/marketplace/v1/sell-orders",
    "sell_orders"
  );
}

export async function getAllowedDenoms(): Promise<AllowedDenom[]> {
  return fetchAllPages<AllowedDenom>(
    "/regen/ecocredit/marketplace/v1/allowed-denoms",
    "allowed_denoms"
  );
}
