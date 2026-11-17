import { Project } from "../domain/project";

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function renderExplorer(project: Project, folder: string[], selectedPath: string): string {
  const items = project.listFolder(folder.join("/"));
  const path = folder.join("/");
  let crumbs = `<button class="crumb" data-folder="">${escapeHtml(project.name)}</button>`;
  let accumulated = "";
  for (let i = 0; i < folder.length; i += 1) {
    accumulated = accumulated ? `${accumulated}/${folder[i]}` : folder[i];
    crumbs += `<span>/</span><button class="crumb" data-folder="${escapeHtml(accumulated)}">${escapeHtml(folder[i])}</button>`;
  }
  let rows = "";
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const itemPath = path ? `${path}/${item.name}` : item.name;
    const active = selectedPath === itemPath ? " selected" : "";
    rows += `<button class="explorer-item${active}" data-item="${escapeHtml(itemPath)}" data-folder-item="${item.isFile ? "false" : "true"}"><span>${item.isFile ? "▤" : "▸"}</span><span>${escapeHtml(item.name)}</span><small>${item.isFile ? "arquivo" : "pasta"}</small></button>`;
  }
  return `<section class="panel explorer"><div class="panel-title"><div><p class="eyebrow">REPOSITÓRIO</p><h2>Arquivos</h2></div><span class="count-pill">${project.countFiles()} arquivos</span></div><nav class="breadcrumbs">${crumbs}</nav><div class="explorer-list">${rows || '<p class="empty-note">Esta pasta está vazia.</p>'}</div><div class="panel-actions"><button class="button primary" data-action="new-file">＋ Novo arquivo</button><button class="button subtle" data-action="remove-file" ${selectedPath ? "" : "disabled"}>Remover arquivo</button></div><p class="path-note">${escapeHtml(path || "Raiz do projeto")}</p></section>`;
}
