import { ActionEntry } from "../domain/action-log";

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function renderHistory(entries: ActionEntry[], users: string[], filter: string): string {
  let options = `<option value="">Todos os usuários</option>`;
  for (let i = 0; i < users.length; i += 1) options += `<option value="${escapeHtml(users[i])}" ${filter === users[i] ? "selected" : ""}>${escapeHtml(users[i])}</option>`;
  let rows = "";
  const counts: Record<string, number> = {};
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    counts[entry.user] = (counts[entry.user] ?? 0) + 1;
    if (filter && entry.user !== filter) continue;
    rows += `<div class="log-row"><time>${entry.time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><b>${escapeHtml(entry.user)}</b><span>${escapeHtml(entry.action)} · ${escapeHtml(entry.target)}</span></div>`;
  }
  let badges = "";
  for (const user in counts) badges += `<span class="count-pill">${escapeHtml(user)}: ${counts[user]}</span>`;
  return `<section class="panel activity"><div class="panel-title"><div><p class="eyebrow">REGISTRO DO PROJETO</p><h2>Atividade</h2></div><select id="log-filter" class="select compact">${options}</select></div><div class="user-counts">${badges}</div><div class="activity-list">${rows || '<p class="empty-note">Nenhuma ação para este filtro.</p>'}</div></section>`;
}
