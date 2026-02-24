import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the ledger module
vi.mock("../ledger.js", () => ({
  listSellOrders: vi.fn(),
  listCreditClasses: vi.fn(),
  listBatches: vi.fn(),
  getAllowedDenoms: vi.fn(),
}));

import { selectBestOrders } from "../order-selector.js";
import { listSellOrders, listCreditClasses, getAllowedDenoms } from "../ledger.js";

const mockedListSellOrders = vi.mocked(listSellOrders);
const mockedListCreditClasses = vi.mocked(listCreditClasses);
const mockedGetAllowedDenoms = vi.mocked(getAllowedDenoms);

beforeEach(() => {
  vi.clearAllMocks();

  // Default allowed denoms
  mockedGetAllowedDenoms.mockResolvedValue([
    { bank_denom: "uregen", display_denom: "REGEN", exponent: 6 },
  ]);

  // Default credit classes
  mockedListCreditClasses.mockResolvedValue([
    { id: "C01", credit_type_abbrev: "C", admin: "", metadata: "" },
    { id: "C02", credit_type_abbrev: "BT", admin: "", metadata: "" },
  ]);
});

describe("selectBestOrders", () => {
  it("selects cheapest orders first", async () => {
    mockedListSellOrders.mockResolvedValue([
      {
        id: "1",
        seller: "regen1seller",
        batch_denom: "C01-001-20210101-20211231-001",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "5000000", // 5 REGEN per credit
        disable_auto_retire: false,
        expiration: null,
      },
      {
        id: "2",
        seller: "regen1seller2",
        batch_denom: "C01-002-20210101-20211231-001",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "2000000", // 2 REGEN per credit - cheaper
        disable_auto_retire: false,
        expiration: null,
      },
    ]);

    const result = await selectBestOrders(undefined, 5);

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].sellOrderId).toBe("2"); // Cheaper order first
    expect(result.insufficientSupply).toBe(false);
  });

  it("fills across multiple orders when needed", async () => {
    mockedListSellOrders.mockResolvedValue([
      {
        id: "1",
        seller: "regen1a",
        batch_denom: "C01-001-20210101-20211231-001",
        quantity: "3",
        ask_denom: "uregen",
        ask_amount: "1000000",
        disable_auto_retire: false,
        expiration: null,
      },
      {
        id: "2",
        seller: "regen1b",
        batch_denom: "C01-002-20210101-20211231-001",
        quantity: "5",
        ask_denom: "uregen",
        ask_amount: "2000000",
        disable_auto_retire: false,
        expiration: null,
      },
    ]);

    const result = await selectBestOrders(undefined, 7);

    expect(result.orders).toHaveLength(2);
    // Should take all 3 from cheapest, then 4 from next
    expect(result.orders[0].quantity).toBe("3.000000");
    expect(result.orders[1].quantity).toBe("4.000000");
    expect(result.insufficientSupply).toBe(false);
  });

  it("reports insufficient supply when not enough orders", async () => {
    mockedListSellOrders.mockResolvedValue([
      {
        id: "1",
        seller: "regen1a",
        batch_denom: "C01-001-20210101-20211231-001",
        quantity: "2",
        ask_denom: "uregen",
        ask_amount: "1000000",
        disable_auto_retire: false,
        expiration: null,
      },
    ]);

    const result = await selectBestOrders(undefined, 10);

    expect(result.insufficientSupply).toBe(true);
    expect(result.orders).toHaveLength(1);
  });

  it("filters out orders with auto-retire disabled", async () => {
    mockedListSellOrders.mockResolvedValue([
      {
        id: "1",
        seller: "regen1a",
        batch_denom: "C01-001-20210101-20211231-001",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "100", // Super cheap but no auto-retire
        disable_auto_retire: true,
        expiration: null,
      },
      {
        id: "2",
        seller: "regen1b",
        batch_denom: "C01-001-20210101-20211231-002",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "1000000",
        disable_auto_retire: false,
        expiration: null,
      },
    ]);

    const result = await selectBestOrders(undefined, 1);

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].sellOrderId).toBe("2");
  });

  it("filters expired orders", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    mockedListSellOrders.mockResolvedValue([
      {
        id: "1",
        seller: "regen1a",
        batch_denom: "C01-001-20210101-20211231-001",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "100",
        disable_auto_retire: false,
        expiration: pastDate,
      },
      {
        id: "2",
        seller: "regen1b",
        batch_denom: "C01-001-20210101-20211231-002",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "5000000",
        disable_auto_retire: false,
        expiration: null,
      },
    ]);

    const result = await selectBestOrders(undefined, 1);

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].sellOrderId).toBe("2");
  });

  it("filters by carbon credit type", async () => {
    mockedListSellOrders.mockResolvedValue([
      {
        id: "1",
        seller: "regen1a",
        batch_denom: "C01-001-20210101-20211231-001",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "1000000",
        disable_auto_retire: false,
        expiration: null,
      },
      {
        id: "2",
        seller: "regen1b",
        batch_denom: "C02-001-20210101-20211231-001",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "500000",
        disable_auto_retire: false,
        expiration: null,
      },
    ]);

    const result = await selectBestOrders("carbon", 1);

    // Should only include C01 (carbon class)
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].sellOrderId).toBe("1");
  });

  it("uses default uregen denom", async () => {
    mockedListSellOrders.mockResolvedValue([
      {
        id: "1",
        seller: "regen1a",
        batch_denom: "C01-001-20210101-20211231-001",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "1000000",
        disable_auto_retire: false,
        expiration: null,
      },
    ]);

    const result = await selectBestOrders(undefined, 1);

    expect(result.paymentDenom).toBe("uregen");
    expect(result.displayDenom).toBe("REGEN");
    expect(result.exponent).toBe(6);
  });

  it("returns empty orders for zero quantity", async () => {
    mockedListSellOrders.mockResolvedValue([
      {
        id: "1",
        seller: "regen1a",
        batch_denom: "C01-001-20210101-20211231-001",
        quantity: "10",
        ask_denom: "uregen",
        ask_amount: "1000000",
        disable_auto_retire: false,
        expiration: null,
      },
    ]);

    const result = await selectBestOrders(undefined, 0);

    expect(result.orders).toHaveLength(0);
    expect(result.insufficientSupply).toBe(false);
  });
});
