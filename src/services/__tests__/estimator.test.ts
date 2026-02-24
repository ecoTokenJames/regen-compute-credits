import { describe, it, expect } from "vitest";
import { estimateFootprint } from "../estimator.js";

describe("estimateFootprint", () => {
  it("returns correct structure", () => {
    const result = estimateFootprint(30);
    expect(result).toHaveProperty("session_minutes", 30);
    expect(result).toHaveProperty("estimated_queries");
    expect(result).toHaveProperty("energy_kwh");
    expect(result).toHaveProperty("co2_kg");
    expect(result).toHaveProperty("co2_tonnes");
    expect(result).toHaveProperty("equivalent_carbon_credits");
    expect(result).toHaveProperty("equivalent_cost_usd");
    expect(result).toHaveProperty("methodology_note");
  });

  it("estimates queries from duration (1.5 per minute)", () => {
    const result = estimateFootprint(20);
    // 20 minutes * 1.5 queries/min = 30 queries
    expect(result.estimated_queries).toBe(30);
  });

  it("uses tool calls as floor when they exceed duration estimate", () => {
    // 5 minutes * 1.5 = 7.5 queries from duration
    // 10 tool calls * 2 = 20 queries from tool calls
    // max(20, 7.5) = 20
    const result = estimateFootprint(5, 10);
    expect(result.estimated_queries).toBe(20);
  });

  it("uses duration estimate when it exceeds tool call floor", () => {
    // 60 minutes * 1.5 = 90 queries from duration
    // 5 tool calls * 2 = 10 from tool calls
    // max(10, 90) = 90
    const result = estimateFootprint(60, 5);
    expect(result.estimated_queries).toBe(90);
  });

  it("calculates energy correctly (0.01 kWh per query)", () => {
    const result = estimateFootprint(20);
    // 30 queries * 0.01 kWh = 0.3 kWh
    expect(result.energy_kwh).toBe(0.3);
  });

  it("calculates CO2 correctly (0.4 kg/kWh)", () => {
    const result = estimateFootprint(20);
    // 0.3 kWh * 0.4 kg/kWh = 0.12 kg
    expect(result.co2_kg).toBe(0.12);
  });

  it("calculates tonnes from kg", () => {
    const result = estimateFootprint(20);
    // 0.12 kg / 1000 = 0.00012 tonnes
    expect(result.co2_tonnes).toBe(0.00012);
  });

  it("equivalent credits equal tonnes CO2", () => {
    const result = estimateFootprint(20);
    expect(result.equivalent_carbon_credits).toBe(result.co2_tonnes);
  });

  it("calculates cost at $40/tonne", () => {
    const result = estimateFootprint(20);
    // 0.00012 tonnes * $40 = $0.0048 → rounded to $0.00
    expect(result.equivalent_cost_usd).toBe(0);
  });

  it("handles zero minutes", () => {
    const result = estimateFootprint(0);
    expect(result.estimated_queries).toBe(0);
    expect(result.energy_kwh).toBe(0);
    expect(result.co2_kg).toBe(0);
  });

  it("handles large sessions", () => {
    const result = estimateFootprint(480); // 8 hour session
    // 480 * 1.5 = 720 queries
    expect(result.estimated_queries).toBe(720);
    expect(result.energy_kwh).toBeGreaterThan(0);
    expect(result.co2_kg).toBeGreaterThan(0);
    expect(result.equivalent_cost_usd).toBeGreaterThan(0);
  });

  it("includes methodology note", () => {
    const result = estimateFootprint(10);
    expect(result.methodology_note).toContain("approximate estimate");
    expect(result.methodology_note).toContain("IEA");
  });
});
