export interface TrieItem<T> {
  name: string;
  isFile: boolean;
  entry: T | null;
}

export class TrieNode<T> {
  public readonly children: TrieNode<T>[] = [];

  public constructor(
    public readonly name: string,
    public isFile = false,
    public entry: T | null = null,
  ) {}
}

export class Trie<T> {
  private readonly root = new TrieNode<T>("");

  /** Insere um arquivo, mantendo os filhos em ordem alfabética. */
  public insertFile(segments: string[], entry: T): void {
    if (segments.length === 0) throw new Error("O caminho do arquivo está vazio.");
    let node = this.root;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (!segment) throw new Error("O caminho contém um trecho vazio.");
      let child: TrieNode<T> | null = null;
      let position = 0;
      while (position < node.children.length && node.children[position].name < segment) position += 1;
      if (position < node.children.length && node.children[position].name === segment) {
        child = node.children[position];
      } else {
        child = new TrieNode<T>(segment);
        for (let j = node.children.length; j > position; j -= 1) node.children[j] = node.children[j - 1];
        node.children[position] = child;
      }
      if (node.isFile) throw new Error("Um arquivo não pode conter outros caminhos.");
      node = child;
      if (i < segments.length - 1 && node.isFile) throw new Error("O caminho já pertence a um arquivo.");
    }
    if (node.isFile) throw new Error("O arquivo já existe.");
    if (node.children.length > 0) throw new Error("Uma pasta existente não pode ser substituída por um arquivo.");
    node.isFile = true;
    node.entry = entry;
  }

  /** Busca o arquivo correspondente aos trechos do caminho. */
  public searchFile(segments: string[]): T | null {
    const node = this.findNode(segments);
    return node && node.isFile ? node.entry : null;
  }

  /** Localiza uma pasta sem alterar a Trie. */
  public findFolder(segments: string[]): TrieNode<T> | null {
    const node = this.findNode(segments);
    return node && !node.isFile ? node : null;
  }

  /** Lista os filhos diretos de uma pasta em ordem alfabética. */
  public listFolder(segments: string[]): TrieItem<T>[] {
    const folder = this.findFolder(segments);
    if (!folder) throw new Error("A pasta não foi encontrada.");
    const items: TrieItem<T>[] = [];
    for (let i = 0; i < folder.children.length; i += 1) {
      const child = folder.children[i];
      items[i] = { name: child.name, isFile: child.isFile, entry: child.entry };
    }
    return items;
  }

  /** Remove um arquivo e apaga pastas ancestrais que ficarem vazias. */
  public removeFile(segments: string[]): T | null {
    if (segments.length === 0) return null;
    const parents: TrieNode<T>[] = [this.root];
    let node = this.root;
    for (let i = 0; i < segments.length; i += 1) {
      const child = this.findChild(node, segments[i]);
      if (!child) return null;
      node = child;
      if (i < segments.length - 1) parents[i + 1] = node;
    }
    if (!node.isFile) return null;
    const entry = node.entry;
    const parent = parents[segments.length - 1];
    const index = this.childIndex(parent, node.name);
    for (let i = index; i < parent.children.length - 1; i += 1) parent.children[i] = parent.children[i + 1];
    parent.children.length -= 1;
    for (let i = segments.length - 1; i > 0; i -= 1) {
      const folder = parents[i];
      if (folder.children.length > 0 || folder.isFile) break;
      const ancestor = parents[i - 1];
      const folderIndex = this.childIndex(ancestor, folder.name);
      for (let j = folderIndex; j < ancestor.children.length - 1; j += 1) ancestor.children[j] = ancestor.children[j + 1];
      ancestor.children.length -= 1;
    }
    return entry;
  }

  /** Conta os nós que representam arquivos. */
  public countFiles(): number {
    return this.countFrom(this.root);
  }

  public listFiles(): T[] {
    const files: T[] = [];
    this.collectFiles(this.root, files);
    return files;
  }

  private findNode(segments: string[]): TrieNode<T> | null {
    let node = this.root;
    for (let i = 0; i < segments.length; i += 1) {
      const child = this.findChild(node, segments[i]);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  private findChild(node: TrieNode<T>, name: string): TrieNode<T> | null {
    for (let i = 0; i < node.children.length; i += 1) {
      if (node.children[i].name === name) return node.children[i];
    }
    return null;
  }

  private childIndex(node: TrieNode<T>, name: string): number {
    for (let i = 0; i < node.children.length; i += 1) if (node.children[i].name === name) return i;
    return -1;
  }

  private countFrom(node: TrieNode<T>): number {
    let count = node.isFile ? 1 : 0;
    for (let i = 0; i < node.children.length; i += 1) count += this.countFrom(node.children[i]);
    return count;
  }

  private collectFiles(node: TrieNode<T>, files: T[]): void {
    if (node.isFile && node.entry !== null) files[files.length] = node.entry;
    for (let i = 0; i < node.children.length; i += 1) this.collectFiles(node.children[i], files);
  }

}
