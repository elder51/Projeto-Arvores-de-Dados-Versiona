import { describe, expect, it } from "vitest";
import { Trie } from "../src/structures/trie";

describe("Trie", () => {
  it("ordena os filhos, compartilha prefixos e limpa pastas vazias", () => {
    const trie = new Trie<string>();
    trie.insertFile(["src", "z.ts"], "z");
    trie.insertFile(["src", "a.ts"], "a");
    expect(trie.listFolder(["src"]).map((item) => item.name)).toEqual(["a.ts", "z.ts"]);
    expect(trie.searchFile(["src", "z.ts"])).toBe("z");
    expect(trie.countFiles()).toBe(2);
    expect(trie.removeFile(["src", "z.ts"])).toBe("z");
    expect(trie.removeFile(["src", "a.ts"])).toBe("a");
    expect(trie.findFolder(["src"])).toBeNull();
  });

  it("rejeita conflitos entre pasta e arquivo", () => {
    const trie = new Trie<number>();
    trie.insertFile(["src"], 1);
    expect(() => trie.insertFile(["src", "app.ts"], 2)).toThrow(/arquivo/i);
    expect(() => trie.insertFile(["src"], 3)).toThrow(/existe/i);
  });
});
