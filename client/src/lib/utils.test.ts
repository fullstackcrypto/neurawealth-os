import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn (class name merger)", () => {
  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns a single class name unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple class names with a space", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });

  it("handles conditional class objects", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
    expect(cn({ active: false, disabled: true })).toBe("disabled");
  });

  it("merges conflicting Tailwind classes, keeping the last one", () => {
    // tailwind-merge should drop the first p-4 in favour of p-8
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("merges conflicting text-color classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles array inputs via clsx spread", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles mixed class strings, objects, and arrays", () => {
    const result = cn("base", { active: true }, ["extra"]);
    expect(result).toContain("base");
    expect(result).toContain("active");
    expect(result).toContain("extra");
  });
});
