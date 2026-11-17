export class AvlNode<T> {
  public left: AvlNode<T> | null = null;
  public right: AvlNode<T> | null = null;
  public height = 1;

  public constructor(public key: number, public value: T) {}
}

export interface AvlNodeView<T> {
  readonly key: number;
  readonly value: T;
  readonly left: AvlNodeView<T> | null;
  readonly right: AvlNodeView<T> | null;
  readonly height: number;
}

export class AvlTree<T> {
  private root: AvlNode<T> | null = null;
  private count = 0;

  /** Insere ou substitui uma chave. */
  public insert(key: number, value: T): void {
    let inserted = false;
    this.root = this.insertNode(this.root, key, value, () => { inserted = true; });
    if (inserted) this.count += 1;
  }

  /** Procura um valor pela chave numérica. */
  public search(key: number): T | null {
    let node = this.root;
    while (node) {
      if (key === node.key) return node.value;
      node = key < node.key ? node.left : node.right;
    }
    return null;
  }

  /** Remove uma chave e rebalanceia a árvore no retorno da recursão. */
  public remove(key: number): T | null {
    const old = this.search(key);
    if (old === null) return null;
    this.root = this.removeNode(this.root, key);
    this.count -= 1;
    return old;
  }

  /** Retorna a versão de maior número cuja data não excede a informada. */
  public findLastUntil(time: Date): T | null {
    let node = this.root;
    let result: T | null = null;
    while (node) {
      const value = node.value as T & { time?: Date };
      if (value.time && value.time.getTime() <= time.getTime()) {
        result = node.value;
        node = node.right;
      } else node = node.left;
    }
    return result;
  }

  /** Retorna os valores ordenados pela chave. */
  public toList(): T[] {
    const values: T[] = [];
    this.collect(this.root, values);
    return values;
  }

  /** Informa a altura da árvore; a árvore vazia tem altura zero. */
  public height(): number {
    return this.nodeHeight(this.root);
  }

  /** Informa quantas chaves estão armazenadas. */
  public size(): number {
    return this.count;
  }

  public rootNode(): AvlNodeView<T> | null {
    return this.root;
  }

  /** Calcula a diferença entre as alturas das subárvores esquerda e direita. */
  public balanceFactor(node: AvlNode<T> | null): number {
    return node ? this.nodeHeight(node.left) - this.nodeHeight(node.right) : 0;
  }

  /** Reorganiza uma subárvore inclinada para a esquerda. */
  private rotateRight(node: AvlNode<T>): AvlNode<T> {
    const pivot = node.left;
    if (!pivot) return node;
    node.left = pivot.right;
    pivot.right = node;
    this.updateHeight(node);
    this.updateHeight(pivot);
    return pivot;
  }

  /** Reorganiza uma subárvore inclinada para a direita. */
  private rotateLeft(node: AvlNode<T>): AvlNode<T> {
    const pivot = node.right;
    if (!pivot) return node;
    node.right = pivot.left;
    pivot.left = node;
    this.updateHeight(node);
    this.updateHeight(pivot);
    return pivot;
  }

  private insertNode(node: AvlNode<T> | null, key: number, value: T, mark: () => void): AvlNode<T> {
    if (!node) {
      mark();
      return new AvlNode(key, value);
    }
    if (key < node.key) node.left = this.insertNode(node.left, key, value, mark);
    else if (key > node.key) node.right = this.insertNode(node.right, key, value, mark);
    else {
      node.value = value;
      return node;
    }
    return this.rebalance(node);
  }

  private removeNode(node: AvlNode<T> | null, key: number): AvlNode<T> | null {
    if (!node) return null;
    if (key < node.key) node.left = this.removeNode(node.left, key);
    else if (key > node.key) node.right = this.removeNode(node.right, key);
    else {
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      let successor = node.right;
      while (successor.left) successor = successor.left;
      node.key = successor.key;
      node.value = successor.value;
      node.right = this.removeNode(node.right, successor.key);
    }
    return this.rebalance(node);
  }

  private rebalance(node: AvlNode<T>): AvlNode<T> {
    this.updateHeight(node);
    const balance = this.balanceFactor(node);
    if (balance > 1) {
      if (this.balanceFactor(node.left) < 0 && node.left) node.left = this.rotateLeft(node.left);
      return this.rotateRight(node);
    }
    if (balance < -1) {
      if (this.balanceFactor(node.right) > 0 && node.right) node.right = this.rotateRight(node.right);
      return this.rotateLeft(node);
    }
    return node;
  }

  private nodeHeight(node: AvlNode<T> | null): number {
    return node ? node.height : 0;
  }

  private updateHeight(node: AvlNode<T>): void {
    const left = this.nodeHeight(node.left);
    const right = this.nodeHeight(node.right);
    node.height = (left > right ? left : right) + 1;
  }

  private collect(node: AvlNode<T> | null, values: T[]): void {
    if (!node) return;
    this.collect(node.left, values);
    values[values.length] = node.value;
    this.collect(node.right, values);
  }
}
