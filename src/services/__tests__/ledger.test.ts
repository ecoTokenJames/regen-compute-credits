import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch to avoid real network calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Reset module-level singletons before each test
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("ledger pagination", () => {
  it("fetches all pages when pagination.next_key is present", async () => {
    // Page 1: has next_key
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classes: [
          { id: "C01", admin: "a1", metadata: "", credit_type_abbrev: "C" },
          { id: "C02", admin: "a2", metadata: "", credit_type_abbrev: "BT" },
        ],
        pagination: { next_key: "abc123", total: "3" },
      }),
    });

    // Page 2: no next_key (last page)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classes: [
          { id: "C03", admin: "a3", metadata: "", credit_type_abbrev: "C" },
        ],
        pagination: { next_key: null, total: "3" },
      }),
    });

    const { listCreditClasses } = await import("../ledger.js");
    const classes = await listCreditClasses();

    expect(classes).toHaveLength(3);
    expect(classes[0].id).toBe("C01");
    expect(classes[2].id).toBe("C03");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify second call includes pagination.key parameter
    const secondCallUrl = mockFetch.mock.calls[1][0] as string;
    expect(secondCallUrl).toContain("pagination.key=abc123");
  });

  it("handles single-page responses (no pagination field)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classes: [
          { id: "C01", admin: "a1", metadata: "", credit_type_abbrev: "C" },
        ],
      }),
    });

    const { listCreditClasses } = await import("../ledger.js");
    const classes = await listCreditClasses();

    expect(classes).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles empty next_key string as no more pages", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sell_orders: [
          {
            id: "1",
            seller: "s1",
            batch_denom: "C01-001",
            quantity: "10",
            ask_denom: "uregen",
            ask_amount: "1000000",
            disable_auto_retire: false,
            expiration: null,
          },
        ],
        pagination: { next_key: "", total: "1" },
      }),
    });

    const { listSellOrders } = await import("../ledger.js");
    const orders = await listSellOrders();

    expect(orders).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("paginates sell orders across multiple pages", async () => {
    // Page 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sell_orders: [
          {
            id: "1",
            seller: "s1",
            batch_denom: "C01-001",
            quantity: "10",
            ask_denom: "uregen",
            ask_amount: "1000000",
            disable_auto_retire: false,
            expiration: null,
          },
        ],
        pagination: { next_key: "page2key", total: "2" },
      }),
    });

    // Page 2
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sell_orders: [
          {
            id: "2",
            seller: "s2",
            batch_denom: "C01-002",
            quantity: "5",
            ask_denom: "uregen",
            ask_amount: "2000000",
            disable_auto_retire: false,
            expiration: null,
          },
        ],
        pagination: { next_key: null, total: "2" },
      }),
    });

    const { listSellOrders } = await import("../ledger.js");
    const orders = await listSellOrders();

    expect(orders).toHaveLength(2);
    expect(orders[0].id).toBe("1");
    expect(orders[1].id).toBe("2");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("paginates projects across multiple pages", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        projects: [
          { id: "P01", class_id: "C01", jurisdiction: "US", metadata: "", reference_id: "" },
        ],
        pagination: { next_key: "nextpage", total: "2" },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        projects: [
          { id: "P02", class_id: "C02", jurisdiction: "BR", metadata: "", reference_id: "" },
        ],
        pagination: { next_key: null, total: "2" },
      }),
    });

    const { listProjects } = await import("../ledger.js");
    const projects = await listProjects();

    expect(projects).toHaveLength(2);
    expect(projects[0].jurisdiction).toBe("US");
    expect(projects[1].jurisdiction).toBe("BR");
  });

  it("URL-encodes the pagination key", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classes: [
          { id: "C01", admin: "", metadata: "", credit_type_abbrev: "C" },
        ],
        pagination: { next_key: "key+with/special=chars", total: "2" },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classes: [
          { id: "C02", admin: "", metadata: "", credit_type_abbrev: "BT" },
        ],
        pagination: { next_key: null, total: "2" },
      }),
    });

    const { listCreditClasses } = await import("../ledger.js");
    await listCreditClasses();

    const secondUrl = mockFetch.mock.calls[1][0] as string;
    expect(secondUrl).toContain("pagination.key=key%2Bwith%2Fspecial%3Dchars");
  });
});

describe("ledger uses loadConfig()", () => {
  it("reads LCD URL from config, not direct env var", async () => {
    const saved = { ...process.env };
    process.env.REGEN_LCD_URL = "https://custom-lcd.example.com";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        allowed_denoms: [
          { bank_denom: "uregen", display_denom: "REGEN", exponent: 6 },
        ],
      }),
    });

    const { getAllowedDenoms } = await import("../ledger.js");
    await getAllowedDenoms();

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("custom-lcd.example.com");

    process.env = saved;
  });
});
