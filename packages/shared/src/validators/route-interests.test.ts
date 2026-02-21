import { describe, it, expect } from "vitest";
import {
  routeInterestFrequencyEnum,
  createRouteInterestSchema,
  createRouteInterestExpressionSchema,
  updateRouteInterestExpressionSchema,
} from "./route-interests";

describe("routeInterestFrequencyEnum", () => {
  it("accepts one_time", () => {
    expect(routeInterestFrequencyEnum.parse("one_time")).toBe("one_time");
  });

  it("accepts repeat", () => {
    expect(routeInterestFrequencyEnum.parse("repeat")).toBe("repeat");
  });

  it("rejects an invalid value", () => {
    expect(() => routeInterestFrequencyEnum.parse("weekly")).toThrowError();
  });
});

describe("createRouteInterestSchema", () => {
  const valid = {
    originCity: "London",
    originCountry: "United Kingdom",
    destinationCity: "Paris",
    destinationCountry: "France",
  };

  it("accepts valid input", () => {
    const result = createRouteInterestSchema.parse(valid);
    expect(result.originCity).toBe("London");
    expect(result.originCountry).toBe("United Kingdom");
    expect(result.destinationCity).toBe("Paris");
    expect(result.destinationCountry).toBe("France");
  });

  it("rejects empty originCity", () => {
    expect(() => createRouteInterestSchema.parse({ ...valid, originCity: "" })).toThrowError();
  });

  it("rejects empty originCountry", () => {
    expect(() => createRouteInterestSchema.parse({ ...valid, originCountry: "" })).toThrowError();
  });

  it("rejects empty destinationCity", () => {
    expect(() => createRouteInterestSchema.parse({ ...valid, destinationCity: "" })).toThrowError();
  });

  it("rejects empty destinationCountry", () => {
    expect(() => createRouteInterestSchema.parse({ ...valid, destinationCountry: "" })).toThrowError();
  });

  it("rejects originCity over 200 chars", () => {
    expect(() => createRouteInterestSchema.parse({ ...valid, originCity: "a".repeat(201) })).toThrowError();
  });

  it("rejects originCountry over 200 chars", () => {
    expect(() => createRouteInterestSchema.parse({ ...valid, originCountry: "a".repeat(201) })).toThrowError();
  });

  it("rejects destinationCity over 200 chars", () => {
    expect(() => createRouteInterestSchema.parse({ ...valid, destinationCity: "a".repeat(201) })).toThrowError();
  });

  it("rejects destinationCountry over 200 chars", () => {
    expect(() => createRouteInterestSchema.parse({ ...valid, destinationCountry: "a".repeat(201) })).toThrowError();
  });

  it("rejects missing required fields", () => {
    expect(() => createRouteInterestSchema.parse({})).toThrowError();
  });
});

describe("createRouteInterestExpressionSchema", () => {
  it("accepts with routeInterestId (no origin/destination required)", () => {
    const result = createRouteInterestExpressionSchema.parse({
      humanId: "h-1",
      routeInterestId: "ri-1",
    });
    expect(result.humanId).toBe("h-1");
    expect(result.routeInterestId).toBe("ri-1");
  });

  it("accepts with all four origin/destination fields (no routeInterestId)", () => {
    const result = createRouteInterestExpressionSchema.parse({
      humanId: "h-1",
      originCity: "London",
      originCountry: "United Kingdom",
      destinationCity: "New York",
      destinationCountry: "United States",
    });
    expect(result.originCity).toBe("London");
    expect(result.destinationCity).toBe("New York");
  });

  it("fails refine when neither routeInterestId nor origin/destination fields provided", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({ humanId: "h-1" }),
    ).toThrowError();
  });

  it("fails refine when only some origin/destination fields are provided (missing destinationCity)", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        originCity: "London",
        originCountry: "United Kingdom",
        destinationCountry: "France",
      }),
    ).toThrowError();
  });

  it("fails refine when only some origin/destination fields are provided (missing originCountry)", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        originCity: "London",
        destinationCity: "Paris",
        destinationCountry: "France",
      }),
    ).toThrowError();
  });

  it("applies default frequency of one_time", () => {
    const result = createRouteInterestExpressionSchema.parse({
      humanId: "h-1",
      routeInterestId: "ri-1",
    });
    expect(result.frequency).toBe("one_time");
  });

  it("accepts explicit frequency repeat", () => {
    const result = createRouteInterestExpressionSchema.parse({
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "repeat",
    });
    expect(result.frequency).toBe("repeat");
  });

  it("accepts optional travel date fields", () => {
    const result = createRouteInterestExpressionSchema.parse({
      humanId: "h-1",
      routeInterestId: "ri-1",
      travelYear: 2025,
      travelMonth: 6,
      travelDay: 15,
    });
    expect(result.travelYear).toBe(2025);
    expect(result.travelMonth).toBe(6);
    expect(result.travelDay).toBe(15);
  });

  it("accepts optional activityId and notes", () => {
    const result = createRouteInterestExpressionSchema.parse({
      humanId: "h-1",
      routeInterestId: "ri-1",
      activityId: "act-1",
      notes: "Business trip every quarter",
    });
    expect(result.activityId).toBe("act-1");
    expect(result.notes).toBe("Business trip every quarter");
  });

  it("rejects empty humanId", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({ humanId: "", routeInterestId: "ri-1" }),
    ).toThrowError();
  });

  it("rejects invalid frequency value", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        routeInterestId: "ri-1",
        frequency: "daily",
      }),
    ).toThrowError();
  });

  it("rejects travelYear below 2020", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        routeInterestId: "ri-1",
        travelYear: 2019,
      }),
    ).toThrowError();
  });

  it("rejects travelYear above 2100", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        routeInterestId: "ri-1",
        travelYear: 2101,
      }),
    ).toThrowError();
  });

  it("rejects travelMonth below 1", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        routeInterestId: "ri-1",
        travelMonth: 0,
      }),
    ).toThrowError();
  });

  it("rejects travelMonth above 12", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        routeInterestId: "ri-1",
        travelMonth: 13,
      }),
    ).toThrowError();
  });

  it("rejects travelDay below 1", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        routeInterestId: "ri-1",
        travelDay: 0,
      }),
    ).toThrowError();
  });

  it("rejects travelDay above 31", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        routeInterestId: "ri-1",
        travelDay: 32,
      }),
    ).toThrowError();
  });

  it("rejects notes over 2000 chars", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        routeInterestId: "ri-1",
        notes: "a".repeat(2001),
      }),
    ).toThrowError();
  });

  it("rejects non-integer travelYear", () => {
    expect(() =>
      createRouteInterestExpressionSchema.parse({
        humanId: "h-1",
        routeInterestId: "ri-1",
        travelYear: 2025.5,
      }),
    ).toThrowError();
  });
});

describe("updateRouteInterestExpressionSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(updateRouteInterestExpressionSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial update with frequency only", () => {
    const result = updateRouteInterestExpressionSchema.parse({ frequency: "repeat" });
    expect(result.frequency).toBe("repeat");
  });

  it("accepts null for nullable travelYear", () => {
    const result = updateRouteInterestExpressionSchema.parse({ travelYear: null });
    expect(result.travelYear).toBeNull();
  });

  it("accepts null for nullable travelMonth", () => {
    const result = updateRouteInterestExpressionSchema.parse({ travelMonth: null });
    expect(result.travelMonth).toBeNull();
  });

  it("accepts null for nullable travelDay", () => {
    const result = updateRouteInterestExpressionSchema.parse({ travelDay: null });
    expect(result.travelDay).toBeNull();
  });

  it("accepts null for nullable notes", () => {
    const result = updateRouteInterestExpressionSchema.parse({ notes: null });
    expect(result.notes).toBeNull();
  });

  it("accepts null for nullable activityId", () => {
    const result = updateRouteInterestExpressionSchema.parse({ activityId: null });
    expect(result.activityId).toBeNull();
  });

  it("accepts a full valid update", () => {
    const result = updateRouteInterestExpressionSchema.parse({
      frequency: "one_time",
      travelYear: 2026,
      travelMonth: 3,
      travelDay: 10,
      notes: "Updated travel notes",
      activityId: "act-99",
    });
    expect(result.frequency).toBe("one_time");
    expect(result.travelYear).toBe(2026);
    expect(result.travelMonth).toBe(3);
    expect(result.travelDay).toBe(10);
    expect(result.notes).toBe("Updated travel notes");
    expect(result.activityId).toBe("act-99");
  });

  it("rejects invalid frequency value", () => {
    expect(() => updateRouteInterestExpressionSchema.parse({ frequency: "monthly" })).toThrowError();
  });

  it("rejects travelYear out of range", () => {
    expect(() => updateRouteInterestExpressionSchema.parse({ travelYear: 1999 })).toThrowError();
  });

  it("rejects travelMonth out of range", () => {
    expect(() => updateRouteInterestExpressionSchema.parse({ travelMonth: 0 })).toThrowError();
  });

  it("rejects travelDay out of range", () => {
    expect(() => updateRouteInterestExpressionSchema.parse({ travelDay: 32 })).toThrowError();
  });

  it("rejects notes over 2000 chars", () => {
    expect(() =>
      updateRouteInterestExpressionSchema.parse({ notes: "a".repeat(2001) }),
    ).toThrowError();
  });

  it("rejects empty activityId string", () => {
    expect(() => updateRouteInterestExpressionSchema.parse({ activityId: "" })).toThrowError();
  });
});
