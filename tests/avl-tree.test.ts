import { describe, expect, it } from "vitest";
import { AvlNodeView, AvlTree } from "../src/structures/avl-tree";

function verify<T>(tree: AvlTree<T>): void {
  function walk(node: AvlNodeView<T> | null, min: number, max: number): number {
    if (!node) return 0;
    if (node.key <= min || node.key >= max) throw new Error("Ordem de busca da AVL inválida.");
    const left = walk(node.left, min, node.key);
    const right = walk(node.right, node.key, max);
    if (Math.abs(left - right) > 1) throw new Error("Fator de balanceamento inválido.");
    const height = Math.max(left, right) + 1;
    if (node.height !== height) throw new Error("Altura armazenada incorreta.");
    return height;
  }
  walk(tree.rootNode(), Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
}

describe("AVL", () => {
  it("permanece balanceada em 1000 inserções e 500 remoções aleatórias", () => {
    const tree = new AvlTree<number>();
    const values: number[] = [];
    for (let i = 1; i <= 1000; i += 1) values[i - 1] = i;
    let seed = 41;
    for (let i = values.length - 1; i > 0; i -= 1) {
      seed = (seed * 16807) % 2147483647;
      const position = seed % (i + 1);
      const value = values[i];
      values[i] = values[position];
      values[position] = value;
    }
    for (let i = 0; i < values.length; i += 1) {
      tree.insert(values[i], values[i]);
      verify(tree);
    }
    for (let i = 1; i <= 500; i += 1) {
      tree.remove(values[i - 1]);
      verify(tree);
    }
    expect(tree.size()).toBe(500);
  });

  it("mantém altura até 14 ao inserir mil chaves em ordem", () => {
    const tree = new AvlTree<number>();
    for (let i = 1; i <= 1000; i += 1) tree.insert(i, i);
    expect(tree.height()).toBeLessThanOrEqual(14);
  });

  it.each([
    { keys: [3, 2, 1], shape: "esquerda-esquerda" },
    { keys: [1, 2, 3], shape: "direita-direita" },
    { keys: [3, 1, 2], shape: "esquerda-direita" },
    { keys: [1, 3, 2], shape: "direita-esquerda" },
  ])("rebalanceia a situação $shape", ({ keys }) => {
    const tree = new AvlTree<number>();
    for (const key of keys) tree.insert(key, key);
    expect(tree.rootNode()?.key).toBe(2);
    expect(tree.toList()).toEqual([1, 2, 3]);
    verify(tree);
  });

  it("encontra a última versão até uma data", () => {
    const tree = new AvlTree<{ time: Date }>();
    for (let i = 1; i <= 3; i += 1) tree.insert(i, { time: new Date(2020, 0, i) });
    expect(tree.findLastUntil(new Date(2020, 0, 2))?.time.getDate()).toBe(2);
  });
});
