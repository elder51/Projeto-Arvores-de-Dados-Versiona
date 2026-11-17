# Decisões do Versiona

As demonstrações visuais das árvores serão feitas nos slides. Este documento registra as escolhas que devem ser explicadas durante a apresentação.

## Trie para caminhos

**Decisão:** organizar caminhos de arquivos em uma Trie cujos filhos ficam em ordem alfabética.

**Por que:** cada trecho do caminho é um nó. Pastas e arquivos compartilham prefixos, e listar uma pasta significa consultar seus filhos diretos. A busca percorre o caminho, com custo O(m·c), em que m é a quantidade de trechos e c a quantidade de filhos examinados.

**Alternativas e por que não:** guardar o caminho inteiro em uma AVL repetiria prefixos e não representaria diretamente a hierarquia de pastas. Uma lista simples exigiria percorrer todos os arquivos para localizar uma pasta.

## AVL para versões

**Decisão:** usar uma árvore AVL para guardar as versões de cada arquivo.

**Por que:** a AVL mantém o fator de balanceamento entre −1 e +1 e garante operações O(log n). Com versões numeradas em ordem, uma árvore binária de busca simples (BST) pode ficar com altura n; para mil versões, a altura da AVL fica até 14.

**Alternativas e por que não:** a BST sem balanceamento degrada com inserções ordenadas. A árvore rubro-negra também balanceia, mas suas regras de cores são menos diretas para esta demonstração. B-tree e B+ são mais adequadas para volumes muito grandes armazenados em disco.

## Chaves das árvores

**Decisão:** cada trecho do caminho é uma chave de nível na Trie; o número sequencial da versão é a chave da AVL.

**Por que:** os trechos correspondem às pastas reais. A numeração crescente torna a busca por intervalo de versões direta e permite exibir o histórico em ordem.

**Alternativas e por que não:** usar o conteúdo do arquivo como chave não representa nem a hierarquia nem a sequência temporal. Usar a data como chave não é necessário, pois o número da versão já é único e crescente.

## Conteúdo separado das árvores

**Decisão:** os nós guardam metadados e um `contentId`; cada conteúdo completo fica no `ContentStore`.

**Por que:** a árvore mantém organização e referências, enquanto o armazenamento separado mantém o texto de cada versão. Para recuperar uma versão, o sistema busca seu metadado e carrega diretamente o conteúdo identificado.

**Alternativas e por que não:** guardar o texto completo dentro dos nós mistura organização com armazenamento e aumenta os nós. O armazenamento bruto por id não substitui as árvores: toda busca e organização continuam sendo feitas pela Trie e pela AVL.

## Remoção de versão

**Decisão:** ao remover uma versão, remover da AVL o metadado e apagar do `ContentStore` o conteúdo associado àquela versão.

**Por que:** cada versão mantém seu próprio texto completo; portanto, remover uma entrada não invalida a recuperação das demais.

**Alternativas e por que não:** manter conteúdo órfão ocuparia espaço sem referência. Reescrever versões restantes seria desnecessário, porque elas não dependem umas das outras.

## Restauração

**Decisão:** restaurar cria uma nova versão cujo conteúdo é igual ao da versão selecionada.

**Por que:** o histórico continua registrando a ação e a ordem em que as mudanças aconteceram; a versão anterior não é sobrescrita.

**Alternativas e por que não:** substituir o conteúdo atual apagaria a sequência de alterações e dificultaria explicar a evolução do arquivo.

## Persistência

**Decisão:** guardar no `localStorage` somente dados brutos serializados; reconstruir Trie e AVL ao carregar o projeto.

**Por que:** as árvores não são serializadas. O carregamento usa os métodos do domínio para recriar arquivos e versões, preservando número, conteúdo, autor, data e registro de ações.

**Alternativas e por que não:** persistir diretamente os nós acoplaria os dados ao formato interno das árvores e poderia restaurar ligações inválidas.

## Hash

**Decisão:** calcular um hash djb2 de 32 bits sobre os caracteres.

**Por que:** é simples de implementar e permite comparar rapidamente os metadados de conteúdos.

**Alternativas e por que não:** uma função criptográfica pronta adicionaria dependências e complexidade que não são necessárias para a comparação didática. Este hash não é criptográfico e não deve ser usado para segurança.

## Arquivos de texto

**Decisão:** aceitar conteúdo textual e manter os dados no armazenamento local do navegador.

**Por que:** facilita edição e comparação por linhas sem depender de serviços externos. Os dados permanecem após recarregar a página no mesmo navegador.

**Alternativas e por que não:** arquivos binários e um servidor de armazenamento exigiriam formatos e serviços adicionais fora do escopo.

## Diff

**Decisão:** comparar linhas por meio da maior subsequência comum, com programação dinâmica.

**Por que:** classifica linhas iguais, adicionadas e removidas de forma clara. O custo é O(n·m), para n e m linhas nos dois textos.

**Alternativas e por que não:** comparar apenas o texto inteiro detectaria diferença, mas não mostraria quais linhas mudaram.
