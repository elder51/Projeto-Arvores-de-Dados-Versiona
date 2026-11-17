export type DiffLine = { type: "same" | "added" | "removed"; text: string };

/** Compara linhas pela maior subsequência comum em O(n·m). */
export function makeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = getLines(oldText);
  const newLines = getLines(newText);
  const table: number[][] = [];
  for (let i = 0; i <= oldLines.length; i += 1) {
    table[i] = [];
    for (let j = 0; j <= newLines.length; j += 1) table[i][j] = 0;
  }
  for (let i = oldLines.length - 1; i >= 0; i -= 1) {
    for (let j = newLines.length - 1; j >= 0; j -= 1) {
      table[i][j] = oldLines[i] === newLines[j]
        ? table[i + 1][j + 1] + 1
        : (table[i + 1][j] > table[i][j + 1] ? table[i + 1][j] : table[i][j + 1]);
    }
  }
  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result[result.length] = { type: "same", text: oldLines[i] };
      i += 1;
      j += 1;
    } else if (j < newLines.length && (i === oldLines.length || table[i][j + 1] > table[i + 1][j])) {
      result[result.length] = { type: "added", text: newLines[j] };
      j += 1;
    } else {
      result[result.length] = { type: "removed", text: oldLines[i] };
      i += 1;
    }
  }
  return result;
}

function getLines(text: string): string[] {
  const lines: string[] = [];
  if (text.length === 0) return lines;
  let line = "";
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") {
      lines[lines.length] = line;
      line = "";
    } else line += text[i];
  }
  lines[lines.length] = line;
  return lines;
}
