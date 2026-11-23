import { describe, expect, test } from "vitest";
import {
  allMet,
  LINE_MAX_LENGTH,
  lineError,
  normalizeLine,
  passwordRequirements,
  usernameRequirements,
} from "./validation";

describe("passwords", () => {
  test.each([
    [7, false],
    [8, true],
    [128, true],
    [129, false],
  ])("%i characters: allowed = %s", (length, allowed) => {
    expect(allMet(passwordRequirements("x".repeat(length)))).toBe(allowed);
  });

  test("the maximum is only mentioned once it's exceeded", () => {
    expect(passwordRequirements("x".repeat(128))).toHaveLength(1);
    expect(passwordRequirements("x".repeat(129))).toHaveLength(2);
  });
});

describe("usernames", () => {
  test.each(["abc", "Greg_Y", "a.b", "x".repeat(30)])("allows %j", (username) => {
    expect(allMet(usernameRequirements(username))).toBe(true);
  });

  test.each(["", "ab", "x".repeat(31), "has space", "a@b.co", "dash-ed", "é".repeat(4)])(
    "rejects %j",
    (username) => {
      expect(allMet(usernameRequirements(username))).toBe(false);
    },
  );
});

describe("lines", () => {
  test("become a single trimmed line", () => {
    expect(normalizeLine("  one\r\n two\t\tthree \n")).toBe("one two three");
  });

  test("lose control characters, which Postgres can't store", () => {
    expect(normalizeLine("a\u0000b")).toBe("a b");
  });

  test("keep accents and emoji", () => {
    expect(normalizeLine("café 🌙")).toBe("café 🌙");
  });

  test("can't be empty", () => {
    expect(lineError(normalizeLine(" \n "))).not.toBeNull();
  });

  test("can be up to the maximum length", () => {
    expect(lineError("x".repeat(LINE_MAX_LENGTH))).toBeNull();
    expect(lineError("x".repeat(LINE_MAX_LENGTH + 1))).not.toBeNull();
  });
});
