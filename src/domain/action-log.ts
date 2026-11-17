export interface ActionEntry {
  time: Date;
  user: string;
  action: string;
  target: string;
}

export class ActionLog {
  private entries: ActionEntry[] = [];

  /** Registra uma ação do projeto com data, usuário e alvo. */
  public add(user: string, action: string, target: string, time = new Date()): void {
    this.entries[this.entries.length] = { time: new Date(time), user, action, target };
  }

  /** Lista todas as ações ou filtra pelo nome do usuário. */
  public listByUser(user?: string): ActionEntry[] {
    const result: ActionEntry[] = [];
    for (let i = 0; i < this.entries.length; i += 1) {
      if (!user || this.entries[i].user === user) {
        const entry = this.entries[i];
        result[result.length] = { ...entry, time: new Date(entry.time) };
      }
    }
    return result;
  }

  public replace(entries: ActionEntry[]): void {
    this.entries = [];
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      this.entries[i] = { ...entry, time: new Date(entry.time) };
    }
  }
}
