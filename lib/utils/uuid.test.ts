import { expect, test } from "vitest";
import { isUuid } from "./uuid";

test("accepts UUIDs in either case", () => {
  const id = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
  expect(isUuid(id)).toBe(true);
  expect(isUuid(id.toUpperCase())).toBe(true);
});

test.each([
  "",
  "nope",
  "3f2b8c1e9a4d4e6f8b7a1c2d3e4f5a6b",
  "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b-extra",
  "gf2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
])("rejects %j", (value) => {
  expect(isUuid(value)).toBe(false);
});
