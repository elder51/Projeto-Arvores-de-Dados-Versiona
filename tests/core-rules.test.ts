import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("mantém o núcleo sem métodos de coleção proibidos", () => {
  const roots = ["src/structures", "src/algorithms"];
  const forbidden = /\.(?:sort|push|pop|shift|slice|splice|concat|map|filter|reduce|forEach|indexOf|includes|join|split)\s*\(|\b(?:Map|Set)\b|Math\./;
  for (let i = 0; i < roots.length; i += 1) {
    const files = readdirSync(roots[i]);
    for (let j = 0; j < files.length; j += 1) {
      const source = readFileSync(join(roots[i], files[j]), "utf8");
      expect(source).not.toMatch(forbidden);
    }
  }
});
