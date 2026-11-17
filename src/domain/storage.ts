import { ActionEntry } from "./action-log";
import { FileEntry } from "./file-entry";
import { Project } from "./project";
import { Workspace } from "./workspace";
import { makeHash } from "../algorithms/hash";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredVersion {
  number: number;
  time: string;
  author: string;
  comment: string;
  size: number;
  hash: string;
  content: string;
}

interface StoredFile {
  path: string;
  nextVersionNumber: number;
  versions: StoredVersion[];
}

interface StoredAction {
  time: string;
  user: string;
  action: string;
  target: string;
}

interface StoredProject {
  name: string;
  users: string[];
  files: StoredFile[];
  actions: StoredAction[];
}

interface StoredWorkspace {
  formatVersion: 1;
  projects: StoredProject[];
}

const storageKey = "versiona-data";

export class WorkspaceStorage {
  public constructor(private readonly storage: KeyValueStorage) {}

  public load(): Workspace {
    try {
      const saved = this.storage.getItem(storageKey);
      if (saved === null) return new Workspace();
      const data = this.decode(JSON.parse(saved) as unknown);
      if (!data) return new Workspace();
      return this.rebuild(data);
    } catch {
      return new Workspace();
    }
  }

  public save(workspace: Workspace): void {
    const data: StoredWorkspace = { formatVersion: 1, projects: [] };
    const projects = workspace.listProjects();
    for (let i = 0; i < projects.length; i += 1) {
      const project = projects[i];
      const stored: StoredProject = { name: project.name, users: [], files: [], actions: [] };
      const users = project.listUsers();
      for (let j = 0; j < users.length; j += 1) stored.users[j] = users[j].name;
      const files = project.listFiles();
      for (let j = 0; j < files.length; j += 1) stored.files[j] = this.saveFile(project, files[j]);
      const actions = project.listActions();
      for (let j = 0; j < actions.length; j += 1) {
        const action = actions[j];
        stored.actions[j] = {
          time: action.time.toISOString(),
          user: action.user,
          action: action.action,
          target: action.target,
        };
      }
      data.projects[i] = stored;
    }
    this.storage.setItem(storageKey, JSON.stringify(data));
  }

  public clear(): void {
    this.storage.removeItem(storageKey);
  }

  private saveFile(project: Project, file: FileEntry): StoredFile {
    const stored: StoredFile = {
      path: file.path,
      nextVersionNumber: file.nextVersionNumber(),
      versions: [],
    };
    const versions = project.getHistory(file);
    for (let i = 0; i < versions.length; i += 1) {
      const version = versions[i];
      stored.versions[i] = {
        number: version.number,
        time: version.time.toISOString(),
        author: version.author,
        comment: version.comment,
        size: version.size,
        hash: version.hash,
        content: project.viewVersion(file, version.number),
      };
    }
    return stored;
  }

  private rebuild(data: StoredWorkspace): Workspace {
    const workspace = new Workspace();
    for (let i = 0; i < data.projects.length; i += 1) {
      const storedProject = data.projects[i];
      const project = workspace.createProject(storedProject.name);
      for (let j = 0; j < storedProject.users.length; j += 1) project.addUser(storedProject.users[j]);
      for (let j = 0; j < storedProject.files.length; j += 1) {
        const storedFile = storedProject.files[j];
        const entry = this.rebuildFile(project, storedFile);
        project.ensureNextVersionNumber(entry, storedFile.nextVersionNumber);
      }
      const actions: ActionEntry[] = [];
      for (let j = 0; j < storedProject.actions.length; j += 1) {
        const action = storedProject.actions[j];
        actions[j] = {
          time: new Date(action.time),
          user: action.user,
          action: action.action,
          target: action.target,
        };
      }
      project.restoreActions(actions);
    }
    if (data.projects.length > 0) workspace.selectProject(data.projects[0].name);
    return workspace;
  }

  private rebuildFile(project: Project, stored: StoredFile): FileEntry {
    let file: FileEntry;
    if (stored.versions.length === 0) {
      file = project.addFile(stored.path, null, "", "Sistema");
      return file;
    }
    const first = stored.versions[0];
    file = project.addFile(
      stored.path,
      first.content,
      first.comment,
      first.author,
      new Date(first.time),
      first.number,
    );
    for (let i = 1; i < stored.versions.length; i += 1) {
      const version = stored.versions[i];
      project.addVersion(
        file,
        version.content,
        version.comment,
        version.author,
        new Date(version.time),
        version.number,
      );
    }
    return file;
  }

  private decode(value: unknown): StoredWorkspace | null {
    if (!this.isRecord(value) || value.formatVersion !== 1 || !Array.isArray(value.projects)) return null;
    const data: StoredWorkspace = { formatVersion: 1, projects: [] };
    for (let i = 0; i < value.projects.length; i += 1) {
      const project = this.decodeProject(value.projects[i]);
      if (!project) return null;
      data.projects[i] = project;
    }
    return data;
  }

  private decodeProject(value: unknown): StoredProject | null {
    if (!this.isRecord(value) || typeof value.name !== "string" || !value.name.trim()
      || !Array.isArray(value.users) || !Array.isArray(value.files) || !Array.isArray(value.actions)) return null;
    const result: StoredProject = { name: value.name, users: [], files: [], actions: [] };
    for (let i = 0; i < value.users.length; i += 1) {
      if (typeof value.users[i] !== "string" || !value.users[i].trim()) return null;
      result.users[i] = value.users[i];
    }
    for (let i = 0; i < value.files.length; i += 1) {
      const file = this.decodeFile(value.files[i]);
      if (!file) return null;
      result.files[i] = file;
    }
    for (let i = 0; i < value.actions.length; i += 1) {
      const action = this.decodeAction(value.actions[i]);
      if (!action) return null;
      result.actions[i] = action;
    }
    return result;
  }

  private decodeFile(value: unknown): StoredFile | null {
    if (!this.isRecord(value) || typeof value.path !== "string" || !value.path.trim()
      || !Number.isInteger(value.nextVersionNumber) || (value.nextVersionNumber as number) < 1
      || !Array.isArray(value.versions)) return null;
    const result: StoredFile = {
      path: value.path,
      nextVersionNumber: value.nextVersionNumber as number,
      versions: [],
    };
    let largestVersion = 0;
    for (let i = 0; i < value.versions.length; i += 1) {
      const version = this.decodeVersion(value.versions[i]);
      if (!version || version.number <= largestVersion) return null;
      largestVersion = version.number;
      result.versions[i] = version;
    }
    if (result.nextVersionNumber <= largestVersion) return null;
    return result;
  }

  private decodeVersion(value: unknown): StoredVersion | null {
    if (!this.isRecord(value) || !Number.isInteger(value.number) || (value.number as number) < 1
      || !this.isDate(value.time) || typeof value.author !== "string" || typeof value.comment !== "string"
      || !Number.isInteger(value.size) || (value.size as number) < 0
      || typeof value.hash !== "string" || typeof value.content !== "string"
      || value.size !== value.content.length || value.hash !== makeHash(value.content)) return null;
    return {
      number: value.number as number,
      time: value.time,
      author: value.author,
      comment: value.comment,
      size: value.size as number,
      hash: value.hash,
      content: value.content,
    };
  }

  private decodeAction(value: unknown): StoredAction | null {
    if (!this.isRecord(value) || !this.isDate(value.time)
      || typeof value.user !== "string" || typeof value.action !== "string" || typeof value.target !== "string") return null;
    return { time: value.time, user: value.user, action: value.action, target: value.target };
  }

  private isDate(value: unknown): value is string {
    return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
