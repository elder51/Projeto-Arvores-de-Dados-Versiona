import { makeDiff } from "../algorithms/diff";

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function renderDiff(left: string, right: string, leftLabel: string, rightLabel: string): string {
  const lines = makeDiff(left, right);
  let leftRows = "";
  let rightRows = "";
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const safeText = escapeHtml(line.text) || "&nbsp;";
    const kind = line.type === "same" ? "same" : line.type;
    leftRows += `<div class="diff-line ${kind}">${line.type === "added" ? "" : safeText}</div>`;
    rightRows += `<div class="diff-line ${kind}">${line.type === "removed" ? "" : safeText}</div>`;
  }
  return `<div class="diff-columns"><div><h3>${escapeHtml(leftLabel)}</h3>${leftRows}</div><div><h3>${escapeHtml(rightLabel)}</h3>${rightRows}</div></div>`;
}
