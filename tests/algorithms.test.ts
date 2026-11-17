import { describe, expect, it } from "vitest";
import { makeDiff } from "../src/algorithms/diff";
import { makeHash } from "../src/algorithms/hash";

describe("algoritmos de comparação", () => {
  it("marca linhas iguais, adicionadas e removidas", () => {
    expect(makeDiff("a\nb", "a\nc")).toEqual([
      { type: "same", text: "a" },
      { type: "removed", text: "b" },
      { type: "added", text: "c" },
    ]);
    expect(makeDiff("", "")).toEqual([]);
    expect(makeDiff("repetida\nrepetida", "repetida")).toEqual([
      { type: "same", text: "repetida" },
      { type: "removed", text: "repetida" },
    ]);
  });
  it("gera hash estável, sem alegar segurança criptográfica", () => {
    expect(makeHash("texto")).toBe(makeHash("texto"));
    expect(makeHash("texto")).not.toBe(makeHash("outro"));
  });
});
