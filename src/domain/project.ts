import { makeHash } from "../algorithms/hash";
import { Trie } from "../structures/trie";
import { ActionEntry, ActionLog } from "./action-log";
import { ContentStore } from "./content-store";
import { FileEntry } from "./file-entry";
import { User } from "./user";
import { Version } from "./version";

export class Project {
  private readonly trie = new Trie<FileEntry>();
  private readonly users: User[] = [];
  private readonly log = new ActionLog();
  private readonly store = new ContentStore();

  public constructor(public readonly name: string) {}

  public listUsers(): User[] {
    return this.users.slice();
  }

  public findUser(name: string): User | null {
    for (let i = 0; i < this.users.length; i += 1) {
      if (this.users[i].name === name) return this.users[i];
    }
    return null;
  }

  public listFiles(): FileEntry[] {
    return this.trie.listFiles();
  }

  public listFolder(path: string): ReturnType<Trie<FileEntry>["listFolder"]> {
    return this.trie.listFolder(Project.splitPath(path));
  }

  public findFile(path: string): FileEntry | null {
    return this.trie.searchFile(Project.splitPath(path));
  }

  public countFiles(): number {
    return this.trie.countFiles();
  }

  public listActions(user?: string): ActionEntry[] {
    return this.log.listByUser(user);
  }

  public restoreActions(entries: ActionEntry[]): void {
    this.log.replace(entries);
  }

  /** Adiciona um usuário ao projeto, sem permitir nomes duplicados. */
  public addUser(name: string, time = new Date()): User {
    if (!name.trim()) throw new Error("Informe o nome do usuário.");
    if (this.findUser(name)) throw new Error("Esse usuário já existe.");
    const user = new User(name);
    this.users[this.users.length] = user;
    this.log.add(name, "Criou usuário", name, time);
    return user;
  }

  /** Cria um arquivo; conteúdo nulo permite reconstruir arquivos sem versões. */
  public addFile(
    path: string,
    content: string | null,
    comment: string,
    author: string,
    time = new Date(),
    versionNumber?: number,
  ): FileEntry {
    const segments = Project.splitPath(path);
    const name = segments[segments.length - 1];
    const entry = new FileEntry(name, segments.join("/"));
    this.trie.insertFile(segments, entry);
    if (content !== null) this.addVersion(entry, content, comment, author, time, versionNumber);
    this.log.add(author, "Adicionou arquivo", entry.path);
    return entry;
  }

  /** Armazena uma versão completa e a insere na AVL pelo número sequencial. */
  public addVersion(
    entry: FileEntry,
    content: string,
    comment: string,
    author: string,
    time = new Date(),
    versionNumber?: number,
  ): Version {
    const number = versionNumber ?? entry.nextVersionNumber();
    if (!Number.isInteger(number) || number < 1) throw new Error("O número da versão é inválido.");
    if (entry.findVersion(number)) throw new Error(`A versão ${number} já existe.`);
    const contentId = this.store.save(content);
    const version = new Version(number, new Date(time), author, comment, content.length, makeHash(content), contentId);
    entry.addVersion(version);
    this.log.add(author, "Criou versão", `${entry.path} v${number}`, time);
    return version;
  }

  /** Recupera o conteúdo completo da versão escolhida. */
  public viewVersion(entry: FileEntry, number: number): string {
    const version = entry.findVersion(number);
    if (!version) throw new Error(`A versão ${number} não foi encontrada.`);
    return this.store.load(version.contentId);
  }

  /** Restaura criando uma nova versão, sem alterar o histórico existente. */
  public restoreVersion(entry: FileEntry, number: number, author: string, time = new Date()): Version {
    const content = this.viewVersion(entry, number);
    const version = this.addVersion(entry, content, `Restaurada da versão ${number}`, author, time);
    this.log.add(author, "Restaurou versão", `${entry.path} v${number}`, time);
    return version;
  }

  /** Remove uma versão e apaga seu conteúdo completo. */
  public removeVersion(entry: FileEntry, number: number, author: string, time = new Date()): void {
    const version = entry.removeVersion(number);
    if (!version) throw new Error(`A versão ${number} não foi encontrada.`);
    this.store.delete(version.contentId);
    this.log.add(author, "Removeu versão", `${entry.path} v${number}`, time);
  }

  /** Remove o arquivo da Trie e seus conteúdos armazenados. */
  public removeFile(path: string, author: string, time = new Date()): void {
    const segments = Project.splitPath(path);
    const entry = this.trie.removeFile(segments);
    if (!entry) throw new Error("O arquivo não foi encontrado.");
    const versions = entry.listVersions();
    for (let i = 0; i < versions.length; i += 1) this.store.delete(versions[i].contentId);
    this.log.add(author, "Removeu arquivo", entry.path, time);
  }

  public ensureNextVersionNumber(entry: FileEntry, number: number): void {
    entry.ensureNextVersionNumber(number);
  }

  public getHistory(entry: FileEntry): Version[] {
    return entry.listVersions();
  }

  public findVersion(entry: FileEntry, number: number): Version | null {
    return entry.findVersion(number);
  }

  public latestVersion(entry: FileEntry): Version | null {
    return entry.latestVersion();
  }

  public findLastUntil(entry: FileEntry, time: Date): Version | null {
    return entry.findLastUntil(time);
  }

  public static splitPath(path: string): string[] {
    const segments: string[] = [];
    let segment = "";
    for (let i = 0; i < path.length; i += 1) {
      const char = path[i];
      if (char === "/" || char === "\\") {
        if (segment) segments[segments.length] = segment;
        segment = "";
      } else segment += char;
    }
    if (segment) segments[segments.length] = segment;
    return segments;
  }
}
