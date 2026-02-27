import { describe, it, expect } from "vitest";
import { batchedPromiseAll } from "$lib/server/batched-promise-all";

describe("batchedPromiseAll", () => {
  it("returns results in input order", async () => {
    const thunks = [
      () => Promise.resolve("a"),
      () => Promise.resolve("b"),
      () => Promise.resolve("c"),
    ];

    const results = await batchedPromiseAll(thunks);
    expect(results).toStrictEqual(["a", "b", "c"]);
  });

  it("respects batch size — max concurrent equals batchSize", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const makeThunk = (value: number) => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      // Yield to simulate async work
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrent--;
      return value;
    };

    const thunks = [makeThunk(1), makeThunk(2), makeThunk(3), makeThunk(4), makeThunk(5), makeThunk(6)];
    const results = await batchedPromiseAll(thunks, 3);

    expect(results).toStrictEqual([1, 2, 3, 4, 5, 6]);
    expect(maxConcurrent).toBe(3);
  });

  it("returns empty array for empty input", async () => {
    const results = await batchedPromiseAll([]);
    expect(results).toStrictEqual([]);
  });

  it("handles single item", async () => {
    const results = await batchedPromiseAll([() => Promise.resolve(42)]);
    expect(results).toStrictEqual([42]);
  });

  it("handles batch size larger than input", async () => {
    const thunks = [
      () => Promise.resolve("x"),
      () => Promise.resolve("y"),
    ];

    const results = await batchedPromiseAll(thunks, 10);
    expect(results).toStrictEqual(["x", "y"]);
  });

  it("defaults to batch size 4", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const makeThunk = (value: number) => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrent--;
      return value;
    };

    const thunks = Array.from({ length: 8 }, (_, i) => makeThunk(i));
    const results = await batchedPromiseAll(thunks);

    expect(results).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(maxConcurrent).toBe(4);
  });
});
