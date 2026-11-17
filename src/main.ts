import { App } from "./ui/app";
import { WorkspaceStorage } from "./domain/storage";
import "./styles/main.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("O elemento principal da aplicação não foi encontrado.");
new App(root, new WorkspaceStorage(window.localStorage)).start();
