import { AvlTree } from "../structures/avl-tree";
import { Version } from "./version";

export class FileEntry {
  private readonly versionTree = new AvlTree<Version>();
  private nextNumber = 1;

  public constructor(public readonly name: string, public readonly path: string) {}

  public addVersion(version: Version): void {
    if (this.versionTree.search(version.number)) throw new Error(`A versão ${version.number} já existe.`);
    this.versionTree.insert(version.number, version);
    if (version.number >= this.nextNumber) this.nextNumber = version.number + 1;
  }

  public removeVersion(number: number): Version | null {
    return this.versionTree.remove(number);
  }

  public findVersion(number: number): Version | null {
    return this.versionTree.search(number);
  }

  public latestVersion(): Version | null {
    const versions = this.versionTree.toList();
    return versions.length ? versions[versions.length - 1] : null;
  }

  public findLastUntil(time: Date): Version | null {
    return this.versionTree.findLastUntil(time);
  }

  public listVersions(): Version[] {
    return this.versionTree.toList();
  }

  public nextVersionNumber(): number {
    return this.nextNumber;
  }

  public ensureNextVersionNumber(number: number): void {
    if (!Number.isInteger(number) || number < 1) throw new Error("O próximo número de versão é inválido.");
    if (number > this.nextNumber) this.nextNumber = number;
  }
}
