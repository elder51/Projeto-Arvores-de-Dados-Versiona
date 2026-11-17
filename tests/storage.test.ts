import { describe, expect, it } from "vitest";
import { KeyValueStorage, WorkspaceStorage } from "../src/domain/storage";
import { Workspace } from "../src/domain/workspace";

class MemoryStorage implements KeyValueStorage {
  private values: Record<string, string> = {};

  public getItem(key: string): string | null {
    return this.values[key] ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values[key] = value;
  }

  public removeItem(key: string): void {
    delete this.values[key];
  }
}

describe("persistência do workspace", () => {
  it("salva e reconstrói conteúdo, histórico, versões ausentes e próximo número", () => {
    const memory = new MemoryStorage();
    const storage = new WorkspaceStorage(memory);
    const workspace = new Workspace();
    const project = workspace.createProject("Projeto", new Date("2024-01-01T10:00:00.000Z"));
    project.addUser("Ana", new Date("2024-01-01T10:01:00.000Z"));
    const file = project.addFile("src/app.js", "um", "inicial", "Ana", new Date("2024-01-01T10:02:00.000Z"));
    project.addVersion(file, "dois", "alteração", "Ana", new Date("2024-01-02T10:00:00.000Z"));
    project.addVersion(file, "três", "outra alteração", "Ana", new Date("2024-01-03T10:00:00.000Z"));
    project.addVersion(file, "quatro", "mais uma", "Ana", new Date("2024-01-04T10:00:00.000Z"));
    project.addVersion(file, "cinco", "última", "Ana", new Date("2024-01-05T10:00:00.000Z"));
    project.removeVersion(file, 2, "Ana", new Date("2024-01-06T10:00:00.000Z"));
    project.removeVersion(file, 5, "Ana", new Date("2024-01-07T10:00:00.000Z"));
    project.addFile("docs/empty.txt", null, "", "Ana");
    const actions = project.listActions();

    storage.save(workspace);
    const storedText = memory.getItem("versiona-data");
    expect(storedText).not.toBeNull();
    expect(storedText).not.toContain("AvlTree");
    expect(storedText).not.toContain('"left"');

    const restored = new WorkspaceStorage(memory).load();
    const restoredProject = restored.getSelectedProject();
    expect(restoredProject?.name).toBe("Projeto");
    expect(restoredProject?.findFile("src/app.js")?.listVersions().map((version) => version.number)).toEqual([1, 3, 4]);
    expect(restoredProject?.findFile("src/app.js")?.nextVersionNumber()).toBe(6);
    expect(restoredProject?.viewVersion(restoredProject.findFile("src/app.js")!, 1)).toBe("um");
    expect(restoredProject?.viewVersion(restoredProject.findFile("src/app.js")!, 3)).toBe("três");
    expect(restoredProject?.viewVersion(restoredProject.findFile("src/app.js")!, 4)).toBe("quatro");
    expect(restoredProject?.findFile("docs/empty.txt")?.listVersions()).toEqual([]);
    expect(restoredProject?.listActions()).toEqual(actions);
    const nextVersion = restoredProject?.addVersion(
      restoredProject.findFile("src/app.js")!,
      "seis",
      "após recarregar",
      "Ana",
    );
    expect(nextVersion?.number).toBe(6);
  });

  it("inicia vazio quando não há dados ou os dados estão corrompidos", () => {
    const memory = new MemoryStorage();
    const storage = new WorkspaceStorage(memory);
    expect(storage.load().listProjects()).toEqual([]);
    memory.setItem("versiona-data", "{ inválido");
    expect(storage.load().listProjects()).toEqual([]);
    memory.setItem("versiona-data", JSON.stringify({ formatVersion: 1, projects: [{ name: "inválido" }] }));
    expect(storage.load().listProjects()).toEqual([]);
  });

  it("remove somente os dados persistidos", () => {
    const memory = new MemoryStorage();
    const storage = new WorkspaceStorage(memory);
    const workspace = new Workspace();
    workspace.createProject("Projeto");
    storage.save(workspace);
    storage.clear();
    expect(memory.getItem("versiona-data")).toBeNull();
  });
});
