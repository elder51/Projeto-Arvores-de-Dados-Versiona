import { describe, expect, it } from "vitest";
import { Project } from "../src/domain/project";
import { Workspace } from "../src/domain/workspace";

describe("domínio", () => {
  it("guarda versões completas, restaura sem apagar histórico e remove arquivo", () => {
    const project = new Project("teste");
    project.addUser("Ana");
    const file = project.addFile("src/app.ts", "um", "inicial", "Ana");
    project.addVersion(file, "dois", "mudança", "Ana");
    project.restoreVersion(file, 1, "Ana");
    expect(project.viewVersion(file, 3)).toBe("um");
    project.removeVersion(file, 2, "Ana");
    expect(project.viewVersion(file, 1)).toBe("um");
    expect(project.listActions("Ana").length).toBeGreaterThan(0);
    project.removeFile("src/app.ts", "Ana");
    expect(project.countFiles()).toBe(0);
  });

  it("cria e seleciona projetos", () => {
    const workspace = new Workspace();
    workspace.createProject("A");
    expect(workspace.selectProject("A").name).toBe("A");
  });

  it("preserva o conteúdo completo de todas as versões ao remover entradas intermediárias", () => {
    const project = new Project("histórico");
    const file = project.addFile("src/app.ts", "conteúdo 1", "inicial", "Ana");
    for (let number = 2; number <= 30; number += 1) {
      project.addVersion(file, `conteúdo ${number}`, `versão ${number}`, "Ana");
    }
    project.removeVersion(file, 8, "Ana");
    project.removeVersion(file, 17, "Ana");
    project.removeVersion(file, 30, "Ana");
    for (let number = 1; number <= 30; number += 1) {
      if (number === 8 || number === 17 || number === 30) continue;
      expect(project.viewVersion(file, number)).toBe(`conteúdo ${number}`);
    }
  });
});
