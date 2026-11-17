import { loadDemoData } from "../data/demo-data";
import { FileEntry } from "../domain/file-entry";
import { Project } from "../domain/project";
import { Workspace } from "../domain/workspace";
import { Version } from "../domain/version";
import { WorkspaceStorage } from "../domain/storage";
import { renderDiff } from "./diff-view";
import { renderExplorer } from "./file-explorer";
import { renderHistory } from "./history-panel";

type EditorMode = "new-project" | "new-user" | "new-file" | "new-version" | "compare";
type AppNotice = { kind: "info" | "error"; message: string };
type PendingConfirmation =
  | { action: "clear-storage"; message: string }
  | { action: "remove-file"; message: string; projectName: string; path: string }
  | { action: "restore-version" | "remove-version"; message: string; projectName: string; path: string; number: number };

export class App {
  private workspace: Workspace;
  private currentUser = "";
  private folder: string[] = [];
  private selectedPath = "";
  private logFilter = "";
  private diffResult = "";
  private preview: { number: number; content: string } | null = null;
  private editorMode: EditorMode | null = null;
  private editorValues: Record<string, string> = {};
  private compareVersionNumber: number | null = null;
  private notice: AppNotice | null = null;
  private pendingConfirmation: PendingConfirmation | null = null;

  public constructor(
    private readonly root: HTMLElement,
    private readonly storage: WorkspaceStorage,
  ) {
    this.workspace = storage.load();
    this.currentUser = this.selectedProject()?.listUsers()[0]?.name ?? "";
  }

  public start(): void {
    this.render();
    this.root.addEventListener("click", (event) => this.runUiAction(() => this.handleClick(event)));
    this.root.addEventListener("change", (event) => this.runUiAction(() => this.handleChange(event)));
    this.root.addEventListener("submit", (event) => {
      event.preventDefault();
      this.runUiAction(() => this.handleSubmit(event));
    });
    this.root.addEventListener("input", (event) => this.runUiAction(() => this.handleInput(event)));
  }

  private selectedProject(): Project | null {
    return this.workspace.getSelectedProject();
  }

  private selectedFile(project: Project | null): FileEntry | null {
    return project && this.selectedPath ? project.findFile(this.selectedPath) : null;
  }

  private render(): void {
    const project = this.selectedProject();
    const file = this.selectedFile(project);
    const users = project?.listUsers() ?? [];
    const versions = file && project ? project.getHistory(file) : [];
    const projects = this.workspace.listProjects();
    let projectOptions = projects.length ? "" : '<option value="">Nenhum projeto</option>';
    for (let i = 0; i < projects.length; i += 1) {
      const item = projects[i];
      projectOptions += `<option value="${this.escape(item.name)}" ${item === project ? "selected" : ""}>${this.escape(item.name)}</option>`;
    }
    let userOptions = users.length ? "" : '<option value="">Nenhum usuário</option>';
    for (let i = 0; i < users.length; i += 1) {
      userOptions += `<option value="${this.escape(users[i].name)}" ${this.currentUser === users[i].name ? "selected" : ""}>${this.escape(users[i].name)}</option>`;
    }
    let versionRows = "";
    for (let i = versions.length - 1; i >= 0; i -= 1) {
      const version = versions[i];
      versionRows += this.renderVersion(version);
    }
    const history = renderHistory(
      project?.listActions() ?? [],
      users.map((user) => user.name),
      this.logFilter,
    );
    this.root.innerHTML = `<header class="topbar"><span class="brand" aria-hidden="true">V</span><strong class="brand-copy">Versiona</strong>
      <div class="top-controls"><label>Projeto<select id="project-select" class="select" ${projects.length ? "" : "disabled"}>${projectOptions}</select></label><button class="button subtle" data-action="new-project">＋ Novo projeto</button>
      <label>Usuário<select id="user-select" class="select" ${users.length ? "" : "disabled"}>${userOptions}</select></label><button class="button subtle" data-action="new-user" ${project ? "" : "disabled"}>＋ Novo usuário</button></div>
      <div class="top-actions"><button class="link-button" data-action="load-demo">Carregar exemplos</button><button class="link-button danger-text" data-action="clear-storage">Apagar dados salvos</button></div></header>
      <main class="workspace-grid">${project ? renderExplorer(project, this.folder, this.selectedPath) : this.renderEmptyExplorer()}
        <section class="panel versions-panel"><div class="panel-title"><div><p class="eyebrow">${this.preview ? "VISUALIZAÇÃO DO ARQUIVO" : this.editorMode === "compare" ? "COMPARAÇÃO DE VERSÕES" : "HISTÓRICO DE VERSÕES"}</p><h2>${this.escape(this.panelHeading(file))}</h2></div>${this.preview ? '<button class="back-button" data-action="back-to-history"><span aria-hidden="true">←</span> Voltar ao histórico</button>' : file && (this.editorMode === null || this.editorMode === "new-version") ? `<span class="count-pill">${versions.length} versões</span>` : ""}</div>
          ${this.renderFeedback()}
          ${this.renderPanelContent(project, file, versionRows)}
        </section>
        ${history}
      </main>`;
  }

  private panelHeading(file: FileEntry | null): string {
    if (this.preview) return `v${this.preview.number}`;
    if (this.editorMode === "new-project") return "Novo projeto";
    if (this.editorMode === "new-user") return "Novo usuário";
    if (this.editorMode === "new-file") return "Novo arquivo";
    if (this.editorMode === "new-version") return "Nova versão";
    if (this.editorMode === "compare") return "Comparar versões";
    return file ? file.name : "Selecione um arquivo";
  }

  private renderFeedback(): string {
    let markup = "";
    if (this.notice) {
      const role = this.notice.kind === "error" ? "alert" : "status";
      markup += `<div class="app-notice ${this.notice.kind}" role="${role}"><span>${this.escape(this.notice.message)}</span><button class="icon-button" data-action="dismiss-notice" aria-label="Fechar mensagem">×</button></div>`;
    }
    if (this.pendingConfirmation) {
      markup += `<div class="confirm-banner" role="group"><span>${this.escape(this.pendingConfirmation.message)}</span><div class="editor-actions"><button class="button primary" data-action="confirm-pending">Confirmar</button><button class="button subtle" data-action="cancel-confirmation">Cancelar</button></div></div>`;
    }
    return markup;
  }

  private renderPanelContent(project: Project | null, file: FileEntry | null, versionRows: string): string {
    if (this.preview && file) {
      return `<div class="file-preview-screen"><p class="file-path">${this.escape(file.path)}</p><pre class="file-preview-full">${this.escape(this.preview.content)}</pre></div>`;
    }
    if (this.editorMode === "new-project") return this.renderProjectEditor();
    if (this.editorMode === "new-user") return this.renderUserEditor();
    if (this.editorMode === "new-file") return this.renderFileEditor();
    if (this.editorMode === "new-version" && project && file) {
      return `<p class="file-path">${this.escape(file.path)}</p>${this.renderVersionEditor(file, project)}`;
    }
    if (this.editorMode === "compare" && project && file) {
      return `<div class="compare-screen"><p class="file-path">${this.escape(file.path)}</p>${this.renderCompareEditor(file, project)}
        ${this.diffResult ? `<div class="diff-panel comparison-result"><div class="panel-title"><h3>Resultado</h3><button class="icon-button" data-action="close-diff" aria-label="Fechar comparação">×</button></div>${this.diffResult}</div>` : ""}
      </div>`;
    }
    if (project && file) {
      return `<p class="file-path">${this.escape(file.path)}</p><div class="version-toolbar"><button class="button primary" data-action="new-version">＋ Nova versão</button><label class="inline-label">Voltar no tempo <input id="time-search" class="input" type="datetime-local"></label><button class="button subtle" data-action="time-search">Consultar</button></div>
        <div class="versions-list">${versionRows ? `<table class="versions-table"><thead><tr><th>Versão</th><th>Data e hora</th><th>Autor</th><th>Tamanho</th><th>Hash</th><th>Comentário</th><th>Ações</th></tr></thead><tbody>${versionRows}</tbody></table>` : '<p class="empty-note">Este arquivo ainda não tem versões.</p>'}</div>`;
    }
    return '<div class="empty-state"><h3>Escolha um arquivo</h3><p>Navegue pelas pastas ou crie um novo arquivo para começar.</p></div>';
  }

  private renderProjectEditor(): string {
    return `<form class="editor-form" data-editor="new-project" novalidate>
      <label>Nome do projeto<input name="name" class="input" value="${this.escape(this.editorValues.name ?? "")}"></label>
      <div class="editor-actions"><button class="button primary" type="submit">Criar projeto</button><button class="button subtle" type="button" data-action="cancel-editor">Cancelar</button></div>
    </form>`;
  }

  private renderUserEditor(): string {
    return `<form class="editor-form" data-editor="new-user" novalidate>
      <label>Nome do usuário<input name="name" class="input" value="${this.escape(this.editorValues.name ?? "")}"></label>
      <div class="editor-actions"><button class="button primary" type="submit">Criar usuário</button><button class="button subtle" type="button" data-action="cancel-editor">Cancelar</button></div>
    </form>`;
  }

  private renderFileEditor(): string {
    return `<form class="editor-form" data-editor="new-file" novalidate>
      <label>Caminho do arquivo<input name="path" class="input" placeholder="Ex.: src/app.js" value="${this.escape(this.editorValues.path ?? "")}"></label>
      <label>Conteúdo<textarea name="content" rows="8">${this.escape(this.editorValues.content ?? "")}</textarea></label>
      <label>Comentário da versão inicial<input name="comment" class="input" value="${this.escape(this.editorValues.comment ?? "")}"></label>
      <div class="editor-actions"><button class="button primary" type="submit">Salvar arquivo</button><button class="button subtle" type="button" data-action="cancel-editor">Cancelar</button></div>
    </form>`;
  }

  private renderVersionEditor(file: FileEntry, project: Project): string {
    const latest = project.latestVersion(file);
    const content = this.editorValues.content ?? (latest ? project.viewVersion(file, latest.number) : "");
    return `<form class="editor-form" data-editor="new-version" novalidate>
      <label>Conteúdo da nova versão<textarea name="content" rows="8">${this.escape(content)}</textarea></label>
      <label>Comentário da versão<input name="comment" class="input" value="${this.escape(this.editorValues.comment ?? "")}"></label>
      <div class="editor-actions"><button class="button primary" type="submit">Salvar versão</button><button class="button subtle" type="button" data-action="cancel-editor">Cancelar</button></div>
    </form>`;
  }

  private renderCompareEditor(file: FileEntry, project: Project): string {
    const versions = project.getHistory(file);
    const baseNumber = this.compareVersionNumber ?? versions[0]?.number ?? 1;
    let otherNumber = Number(this.editorValues.otherVersion ?? Math.max(1, baseNumber - 1));
    let foundOther = false;
    for (let i = 0; i < versions.length; i += 1) {
      if (versions[i].number !== baseNumber && versions[i].number === otherNumber) foundOther = true;
    }
    if (!foundOther) {
      for (let i = 0; i < versions.length; i += 1) {
        if (versions[i].number !== baseNumber) {
          otherNumber = versions[i].number;
          foundOther = true;
          break;
        }
      }
    }
    let options = "";
    for (let i = 0; i < versions.length; i += 1) {
      const version = versions[i];
      if (version.number === baseNumber) continue;
      options += `<option value="${version.number}" ${version.number === otherNumber ? "selected" : ""}>v${version.number}</option>`;
    }
    return `<form class="editor-form compare-form" data-editor="compare" novalidate>
      <p>Versão selecionada: <strong>v${baseNumber}</strong></p>
      ${foundOther ? `<label>Comparar com<select name="otherVersion" class="select">${options}</select></label>` : '<p class="empty-note">Não há outra versão para comparar.</p>'}
      <div class="editor-actions"><button class="button primary" type="submit" ${foundOther ? "" : "disabled"}>Comparar versões</button><button class="button subtle" type="button" data-action="cancel-editor">${this.diffResult ? "Voltar ao histórico" : "Cancelar"}</button></div>
    </form>`;
  }

  private renderVersion(version: Version): string {
    return `<tr><td class="version-number">v${version.number}</td><td>${version.time.toLocaleString("pt-BR")}</td><td>${this.escape(version.author)}</td><td>${version.size} caracteres</td><td><code>${version.hash}</code></td><td>${this.escape(version.comment || "Sem comentário")}</td><td class="table-actions">
      <button data-version-action="view" data-version="${version.number}">Visualizar</button><button data-version-action="restore" data-version="${version.number}">Restaurar</button><button data-version-action="diff" data-version="${version.number}">Comparar</button><button class="danger-text" data-version-action="remove" data-version="${version.number}">Remover</button></td></tr>`;
  }

  private renderEmptyExplorer(): string {
    return `<section class="panel explorer"><div class="panel-title"><div><p class="eyebrow">REPOSITÓRIO</p><h2>Arquivos</h2></div></div><div class="empty-state"><h3>Nenhum projeto selecionado</h3><p>Crie um projeto ou carregue os dados de exemplo.</p></div></section>`;
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
    const item = target.closest<HTMLElement>("[data-item]");
    const folder = target.closest<HTMLElement>("[data-folder]");
    const versionAction = target.closest<HTMLElement>("[data-version-action]");
    if (item) {
      const path = item.dataset.item ?? "";
      if (item.dataset.folderItem === "true") this.folder = Project.splitPath(path);
      else {
        this.selectedPath = path;
        this.diffResult = "";
        this.preview = null;
        this.clearEditor();
        this.pendingConfirmation = null;
        this.notice = null;
      }
      this.render();
      return;
    }
    if (folder) {
      this.folder = Project.splitPath(folder.dataset.folder ?? "");
      this.render();
      return;
    }
    if (versionAction) {
      this.handleVersion(versionAction.dataset.versionAction ?? "", Number(versionAction.dataset.version));
      return;
    }
    if (action) this.handleAction(action);
  }

  private handleAction(action: string): void {
    const project = this.selectedProject();
    const file = this.selectedFile(project);
    if (action === "new-project") {
      this.openEditor("new-project");
    } else if (action === "new-user" && project) {
      this.openEditor("new-user");
    } else if (action === "load-demo") {
      this.workspace = loadDemoData();
      this.currentUser = this.selectedProject()?.listUsers()[0]?.name ?? "";
      this.folder = [];
      this.selectedPath = "";
      this.diffResult = "";
      this.preview = null;
      this.clearEditor();
      this.pendingConfirmation = null;
      this.notice = null;
      this.logFilter = "";
      this.saveWorkspace();
    } else if (action === "clear-storage") {
      this.requestConfirmation({ action: "clear-storage", message: "Apagar os dados salvos e limpar a aplicação?" });
    } else if (action === "new-file" && project) {
      this.openEditor("new-file");
    } else if (action === "remove-file" && project && file) {
      this.requestConfirmation({
        action: "remove-file",
        message: `Remover ${file.path} e todas as suas versões?`,
        projectName: project.name,
        path: file.path,
      });
    } else if (action === "new-version" && project && file) {
      const latest = project.latestVersion(file);
      this.openEditor("new-version", {
        content: latest ? project.viewVersion(file, latest.number) : "",
        comment: "",
      });
    } else if (action === "time-search" && project && file) {
      const input = this.root.querySelector<HTMLInputElement>("#time-search");
      if (input?.value) {
        const version = project.findLastUntil(file, new Date(input.value));
        this.notice = {
          kind: "info",
          message: version ? `Naquela data, a versão era v${version.number}.` : "Não havia versão nessa data.",
        };
      }
    } else if (action === "close-diff") this.diffResult = "";
    else if (action === "back-to-history") this.preview = null;
    else if (action === "cancel-editor") {
      this.clearEditor();
      this.diffResult = "";
    }
    else if (action === "confirm-pending") this.executePendingConfirmation();
    else if (action === "cancel-confirmation") this.pendingConfirmation = null;
    else if (action === "dismiss-notice") this.notice = null;
    this.render();
  }

  private handleSubmit(event: Event): void {
    const mode = this.editorMode;
    if (!mode || !(event.target instanceof HTMLFormElement) || event.target.dataset.editor !== mode) return;
    const values = new FormData(event.target);
    this.editorValues = {};
    for (const [key, value] of values.entries()) if (typeof value === "string") this.editorValues[key] = value;
    this.notice = null;
    if (mode === "compare") {
      const project = this.selectedProject();
      const file = this.selectedFile(project);
      const baseNumber = this.compareVersionNumber;
      const otherNumber = Number(this.editorValues.otherVersion);
      if (!project || !file || baseNumber === null || otherNumber === baseNumber) throw new Error("Selecione duas versões existentes para comparar.");
      const base = project.findVersion(file, baseNumber);
      const other = project.findVersion(file, otherNumber);
      if (!base || !other) throw new Error("Selecione duas versões existentes para comparar.");
      this.diffResult = renderDiff(
        project.viewVersion(file, base.number),
        project.viewVersion(file, other.number),
        `v${base.number}`,
        `v${other.number}`,
      );
      this.preview = null;
      this.render();
      return;
    }
    if (mode === "new-project") {
      const name = this.editorValues.name ?? "";
      const created = this.workspace.createProject(name);
      this.currentUser = this.currentUser || "Ana";
      created.addUser(this.currentUser);
      this.folder = [];
      this.selectedPath = "";
      this.diffResult = "";
      this.preview = null;
      this.logFilter = "";
    } else if (mode === "new-user") {
      const project = this.selectedProject();
      if (!project) throw new Error("Selecione um projeto antes de criar um usuário.");
      project.addUser(this.editorValues.name ?? "");
      this.currentUser = this.editorValues.name ?? "";
    } else if (mode === "new-file") {
      const project = this.selectedProject();
      if (!project) throw new Error("Selecione um projeto antes de criar um arquivo.");
      const path = this.editorValues.path ?? "";
      if (!path.trim()) throw new Error("Informe o caminho do arquivo.");
      const file = project.addFile(
        path,
        this.editorValues.content ?? "",
        this.editorValues.comment ?? "",
        this.requireCurrentUser(),
      );
      this.selectedPath = file.path;
      this.folder = Project.splitPath(file.path).slice(0, -1);
    } else {
      const project = this.selectedProject();
      const file = this.selectedFile(project);
      if (!project || !file) throw new Error("Selecione um arquivo antes de criar uma versão.");
      project.addVersion(
        file,
        this.editorValues.content ?? "",
        this.editorValues.comment ?? "",
        this.requireCurrentUser(),
      );
    }
    this.clearEditor();
    this.saveWorkspace();
    this.render();
  }

  private openEditor(mode: EditorMode, values: Record<string, string> = {}): void {
    this.editorMode = mode;
    this.editorValues = values;
    this.compareVersionNumber = null;
    this.pendingConfirmation = null;
    this.notice = null;
    this.diffResult = "";
    this.preview = null;
  }

  private clearEditor(): void {
    this.editorMode = null;
    this.editorValues = {};
    this.compareVersionNumber = null;
  }

  private requestConfirmation(confirmation: PendingConfirmation): void {
    this.pendingConfirmation = confirmation;
    this.clearEditor();
    this.notice = null;
  }

  private executePendingConfirmation(): void {
    const confirmation = this.pendingConfirmation;
    if (!confirmation) return;
    if (confirmation.action === "clear-storage") {
      this.storage.clear();
      this.workspace = new Workspace();
      this.currentUser = "";
      this.folder = [];
      this.selectedPath = "";
      this.diffResult = "";
      this.preview = null;
      this.clearEditor();
      this.logFilter = "";
      this.pendingConfirmation = null;
      return;
    }
    const project = this.workspace.findProject(confirmation.projectName);
    if (!project) throw new Error(`O projeto ${confirmation.projectName} não foi encontrado.`);
    if (confirmation.action === "remove-file") {
      project.removeFile(confirmation.path, this.requireCurrentUser());
      if (this.selectedProject() === project && this.selectedPath === confirmation.path) {
        this.selectedPath = "";
        this.diffResult = "";
        this.preview = null;
      }
    } else {
      const file = project.findFile(confirmation.path);
      if (!file) throw new Error(`O arquivo ${confirmation.path} não foi encontrado.`);
      if (confirmation.action === "restore-version") {
        project.restoreVersion(file, confirmation.number, this.requireCurrentUser());
      } else {
        project.removeVersion(file, confirmation.number, this.requireCurrentUser());
        if (this.selectedProject() === project && this.selectedPath === confirmation.path) {
          this.diffResult = "";
          if (this.preview?.number === confirmation.number) this.preview = null;
        }
      }
    }
    this.pendingConfirmation = null;
    this.saveWorkspace();
  }

  private handleVersion(action: string, number: number): void {
    const project = this.selectedProject();
    const file = this.selectedFile(project);
    if (!project || !file) return;
    if (action === "view") {
      this.preview = { number, content: project.viewVersion(file, number) };
      this.diffResult = "";
    }
    else if (action === "restore") {
      this.requestConfirmation({
        action: "restore-version",
        message: `Criar uma nova versão com o conteúdo de v${number}?`,
        projectName: project.name,
        path: file.path,
        number,
      });
    } else if (action === "remove") {
      this.requestConfirmation({
        action: "remove-version",
        message: `Remover a versão v${number}?`,
        projectName: project.name,
        path: file.path,
        number,
      });
    } else if (action === "diff") {
      this.openEditor("compare", { otherVersion: String(Math.max(1, number - 1)) });
      this.compareVersionNumber = number;
    }
    this.render();
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target.form?.dataset.editor === this.editorMode && target.name) {
      this.editorValues[target.name] = target.value;
      return;
    }
    if (target.id === "project-select" && target.value) {
      this.workspace.selectProject(target.value);
      this.currentUser = this.selectedProject()?.listUsers()[0]?.name ?? "";
      this.folder = [];
      this.selectedPath = "";
      this.diffResult = "";
      this.preview = null;
      this.clearEditor();
      this.pendingConfirmation = null;
      this.notice = null;
      this.logFilter = "";
    } else if (target.id === "user-select") this.currentUser = target.value;
    else if (target.id === "log-filter") this.logFilter = target.value;
    else return;
    this.render();
  }

  private handleInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    if (!target.name || target.form?.dataset.editor !== this.editorMode) return;
    this.editorValues[target.name] = target.value;
  }

  private requireCurrentUser(): string {
    if (!this.currentUser) throw new Error("Crie ou selecione um usuário primeiro.");
    return this.currentUser;
  }

  private saveWorkspace(): void {
    this.storage.save(this.workspace);
  }

  private escape(text: string): string {
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  private runUiAction(action: () => void): void {
    try {
      action();
    } catch (error) {
      this.notice = { kind: "error", message: error instanceof Error ? error.message : "Não foi possível concluir a ação." };
      this.render();
    }
  }
}
