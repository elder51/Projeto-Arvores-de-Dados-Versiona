import { Project } from "./project";

export class Workspace {
  private readonly projects: Project[] = [];
  private selectedProject: Project | null = null;

  /** Cria e seleciona um projeto com nome único. */
  public createProject(name: string, time = new Date()): Project {
    if (!name.trim()) throw new Error("Informe o nome do projeto.");
    if (this.findProject(name)) throw new Error("Esse projeto já existe.");
    const project = new Project(name);
    this.projects[this.projects.length] = project;
    this.selectedProject = project;
    project.restoreActions([{ time, user: "Sistema", action: "Criou projeto", target: name }]);
    return project;
  }

  public listProjects(): Project[] {
    return this.projects.slice();
  }

  public getSelectedProject(): Project | null {
    return this.selectedProject;
  }

  /** Busca um projeto pelo nome. */
  public findProject(name: string): Project | null {
    for (let i = 0; i < this.projects.length; i += 1) if (this.projects[i].name === name) return this.projects[i];
    return null;
  }

  /** Seleciona um projeto existente ou informa erro. */
  public selectProject(name: string): Project {
    const project = this.findProject(name);
    if (!project) throw new Error(`O projeto ${name} não foi encontrado.`);
    this.selectedProject = project;
    return project;
  }
}
