export class ContentStore {
  private contents: Record<string, string> = {};
  private nextId = 1;

  /** Guarda o texto completo e devolve uma referência única. */
  public save(text: string): string {
    const id = `content-${this.nextId}`;
    this.nextId += 1;
    this.contents[id] = text;
    return id;
  }

  /** Recupera o texto associado a uma referência. */
  public load(id: string): string {
    const text = this.contents[id];
    if (text === undefined) throw new Error(`Conteúdo ${id} não encontrado.`);
    return text;
  }

  /** Apaga o conteúdo associado a uma referência. */
  public delete(id: string): void {
    if (this.contents[id] === undefined) throw new Error(`Conteúdo ${id} não encontrado.`);
    delete this.contents[id];
  }

  /** Soma o tamanho dos textos completos guardados. */
  public totalStoredSize(): number {
    let size = 0;
    for (const id in this.contents) size += this.contents[id].length;
    return size;
  }
}
