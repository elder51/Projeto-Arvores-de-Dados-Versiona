import { Workspace } from "../domain/workspace";

const initialCode = [
  "const title = 'Loja';",
  "function start() {",
  "  console.log(title);",
  "}",
].join("\n");

/** Cria projetos de demonstração usando o fluxo normal do domínio. */
export function loadDemoData(workspace = new Workspace()): Workspace {
  const shop = workspace.createProject("site-da-loja");
  shop.addUser("Ana");
  shop.addUser("Bruno");
  shop.addUser("Carla");
  const paths = ["src/components/app.js", "src/components/cart.js", "src/services/catalog.js", "src/styles/main.css", "docs/readme.txt", "public/index.html"];
  for (let i = 0; i < paths.length; i += 1) {
    const entry = shop.addFile(paths[i], `${initialCode}\n// arquivo ${i + 1}`, "Versão inicial", "Ana");
    const count = i === 0 ? 20 : 4;
    for (let version = 2; version <= count; version += 1) {
      shop.addVersion(entry, `${initialCode}\n// arquivo ${i + 1}, ajuste ${version}`, `Ajuste ${version}`, version % 2 === 0 ? "Bruno" : "Carla");
    }
    if (i === 0) shop.removeVersion(entry, 8, "Ana");
  }
  const school = workspace.createProject("trabalho-de-algoritmos");
  school.addUser("Ana");
  school.addUser("Bruno");
  school.addUser("Carla");
  const schoolPaths = ["src/structures/trie.ts", "src/structures/avl.ts", "src/main.ts", "docs/introducao.txt", "tests/trees.test.ts", "assets/exemplo.txt"];
  for (let i = 0; i < schoolPaths.length; i += 1) {
    const entry = school.addFile(schoolPaths[i], `// ${schoolPaths[i]}\nconst etapa = 1;`, "Versão inicial", "Ana");
    for (let version = 2; version <= 3 + (i % 3); version += 1) {
      school.addVersion(entry, `// ${schoolPaths[i]}\nconst etapa = ${version};`, `Etapa ${version}`, "Bruno");
    }
  }
  workspace.selectProject(shop.name);
  return workspace;
}
