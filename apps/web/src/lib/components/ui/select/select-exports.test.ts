import { describe, it, expect } from "vitest";
import * as Select from "./index.js";

describe("ui/select exports", () => {
  it("exports Root, Content, Item, Trigger, Group", () => {
    expect(Select.Root).toBeDefined();
    expect(Select.Content).toBeDefined();
    expect(Select.Item).toBeDefined();
    expect(Select.Trigger).toBeDefined();
    expect(Select.Group).toBeDefined();
  });

  it("does NOT export Value (removed in bits-ui v2.16.1)", () => {
    expect("Value" in Select).toBe(false);
  });
});
