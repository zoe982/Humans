import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import SkeletonCard from "./SkeletonCard.svelte";

describe("SkeletonCard", () => {
  it("renders a glass-card container", () => {
    const { container } = render(SkeletonCard, { props: {} });
    expect(container.querySelector(".glass-card")).not.toBeNull();
  });

  it("renders with default 3 lines (1 heading + 2 body skeletons)", () => {
    const { container } = render(SkeletonCard, { props: {} });
    // Skeleton component renders a div — one for heading row, two for body rows
    const skeletons = container.querySelectorAll(".glass-card > div");
    // The outer card has a heading Skeleton + (lines-1) body Skeletons
    // The outer wrapper itself is the glass-card, children are the skeletons
    const children = container.querySelector(".glass-card")?.children;
    expect(children?.length).toBe(3);
  });

  it("renders the correct number of skeleton elements when lines=5", () => {
    const { container } = render(SkeletonCard, { props: { lines: 5 } });
    const children = container.querySelector(".glass-card")?.children;
    expect(children?.length).toBe(5);
  });

  it("renders a single skeleton element when lines=1", () => {
    const { container } = render(SkeletonCard, { props: { lines: 1 } });
    const children = container.querySelector(".glass-card")?.children;
    expect(children?.length).toBe(1);
  });

  it("heading skeleton has w-40 class", () => {
    const { container } = render(SkeletonCard, { props: {} });
    const glassCard = container.querySelector(".glass-card");
    const firstChild = glassCard?.children[0];
    expect(firstChild?.className).toContain("w-40");
  });

  it("body skeleton rows have w-28 class", () => {
    const { container } = render(SkeletonCard, { props: {} });
    const glassCard = container.querySelector(".glass-card");
    const secondChild = glassCard?.children[1];
    expect(secondChild?.className).toContain("w-28");
  });
});
