# Livro de Ordens — como instalar a nova versão

São **2 arquivos**, exatamente os mesmos nomes que você já tem no projeto do Apps Script.
Nada muda na planilha e a URL do sistema continua a mesma (o link do Vercel não precisa ser trocado).

---

## 1. Abrir o projeto

1. Vá em <https://script.google.com> e abra o projeto **LIVRO DE ORDENS**.
2. Confirme que na coluna **Arquivos** existem os dois arquivos: `Código.gs` e `Dashboard.html`.

> Antes de colar, se quiser um seguro: menu **⋮** ao lado de cada arquivo → nada a fazer,
> o Apps Script guarda o histórico sozinho (relógio ↺ na barra lateral esquerda,
> "Histórico de alterações"). Dá para voltar a qualquer momento.

---

## 2. Colar o arquivo `Código.gs`

1. Clique em **Código.gs**.
2. Clique dentro do editor e aperte **Ctrl + A** (seleciona tudo) e **Delete**.
3. Cole todo o conteúdo do arquivo **`apps-script/Codigo.gs`**.
4. Confira a linha 15 — o ID da planilha já está preenchido:

   ```js
   var PLANILHA_ID = '1Dfy5i1clsAMUVYQnOh6sPQo-vZwL5A4aoxnjabCpg7Q';
   ```

---

## 3. Colar o arquivo `Dashboard.html`

1. Clique em **Dashboard.html**.
2. **Ctrl + A** → **Delete**.
3. Cole todo o conteúdo do arquivo **`apps-script/Dashboard.html`**.
4. Aperte **Ctrl + S** para salvar os dois arquivos.

---

## 4. Testar a leitura da planilha (30 segundos, evita surpresa)

1. Na barra de cima do editor, no seletor de funções, escolha **`conferirLeitura`**.
2. Clique em **Executar**. Se pedir autorização, autorize com sua conta.
3. Abra **Registro de execução**. Deve aparecer algo assim:

   ```
   LIVRO DE ORDENS: 1043 registros | campos: boletim, data, interesse | sem link: 0 | conferido ate 14/08/2026
   MANUAIS: 30 registros | campos: - | sem link: 0
   PROCEDIMENTO OPERACIONAL PADRÃO: 72 registros | campos: tipo | sem link: 0
   LEIS E REGULAMENTOS: 60 registros | campos: interesse | sem link: 0
   JURISPRUDENCIA: 7 registros | campos: - | sem link: 0
   NORMATIVO DE OBRAS PÚBLICAS: 25 registros | campos: ano | sem link: 0
   TOTAL: ... registros em 6 abas.
   ```

   Se alguma aba aparecer com **0 registros** ou com **sem link** alto, é a planilha:
   confira se a linha de cabeçalho daquela aba tem a palavra **NOME** e se os títulos
   estão com o link colado na própria célula.

---

## 5. Publicar (mantendo a mesma URL)

1. Botão azul **Implantar** → **Gerenciar implantações**.
2. Na implantação que já existe, clique no **lápis** (Editar).
3. Em **Versão**, escolha **Nova versão**.
4. **Implantar**.

Pronto: a URL `.../exec` continua idêntica, o link do Vercel segue funcionando.

> Se criar uma implantação **nova** em vez de editar a existente, a URL muda e aí sim
> você teria que atualizar o `index.html` do Vercel. Edite a existente.

---

## 6. Depois de atualizar a planilha

Os dados ficam em cache por 6 horas para a página abrir rápido. Para forçar a releitura:

- clique em **"Reler a planilha agora"** no rodapé do sistema; ou
- abra a URL com `?recarregar=1` no fim; ou
- rode a função **`limparCache`** no editor.

---

## O que mudou (resumo)

**Busca**
- Cada aba é uma coleção de verdade: você escolhe **onde** está procurando na lateral
  esquerda, e a busca fica restrita àquela aba.
- Quando há resultado nas outras abas, aparece o aviso *"Há mais N nas outras abas —
  buscar em todas"*. Buscando em todas, cada resultado mostra de qual aba veio e há uma
  barra de contagem por aba para restringir com um clique.
- Some o "pts": a pontuação de relevância continua existindo, mas por baixo do pano,
  como deve ser. Sumiu também o menu suspenso que duplicava a lista.
- Aceita: várias palavras (todas precisam bater), `"expressão exata"` entre aspas,
  número do boletim (`146` ou `bol 146`), ano, sigla de interesse e acento opcional
  (`sindicancia` acha `SINDICÂNCIA`).

**Filtros**
- Só aparecem os filtros que fazem sentido na aba aberta: ano/interesse no LIVRO DE
  ORDENS, tipo no POP, interesse nas LEIS. Antes, filtros de uma aba eram aplicados a
  todas as outras.

**Interface**
- Layout de índice de arquivo: lista densa com linha de identificação
  (aba · boletim · data · interesse) acima do título em serifa. Nada de card com brilho.
- Modo claro e escuro (botão no topo, lembra a escolha).
- Teclado: `/` ou `Ctrl+K` foca a busca, `↑ ↓` andam na lista, `Enter` abre o documento,
  `Esc` limpa.
- Funciona no celular (as abas viram uma faixa rolável no topo).
- Impressão: `Ctrl+P` sai a lista inteira do resultado, sem menus.

**Manutenção**
- O `Código.gs` lê as abas **pelo cabeçalho**, não por posição fixa. Se você criar uma aba
  nova na planilha, ela entra sozinha no sistema — basta ter uma linha com **NOME** e os
  títulos com link. Colunas reconhecidas: `NOME`, `Nº DO BOL`, `DATA`, `INTERESSE`,
  `TIPO ...`, `ANO`.
- Aba oculta na planilha não aparece no sistema.
- Documento sem link não some da lista: aparece marcado como **sem link**, para você
  saber que falta cadastrar.

---

## Observação

A tarja *"Este aplicativo foi criado por um usuário do Google Apps Script"* no topo é do
próprio Google em aplicativos publicados para "qualquer pessoa". Não há como remover pelo
código — ela só desaparece se o sistema for servido por outro domínio (por exemplo, uma
página no Vercel consumindo os dados via API).
