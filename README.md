# Ctônia (estrutura modular)

Mesmo sistema de antes (Hub, Biblioteca/Web Reader, Gerenciar, Academia, Livro de Feituras e Laboratório), mas cada parte
agora é um arquivo de verdade, sem Base64. O código foi **cortado, não reescrito**: cada linha é a mesma de antes.

## Como publicar (e não perder dados)

Os dados (localStorage e IndexedDB) pertencem ao **endereço** do site (protocolo + domínio + porta).
Esta versão usa o mesmo mecanismo da anterior, então **se você publicar no mesmo endereço de antes, tudo continua lá**.

1. No site atual, abra o portal e clique em **Gerar backup**. Guarde o .json.
   (O backup cobre localStorage e a Biblioteca; os arquivos anexados da Academia ficam só no navegador, por isso mantenha o mesmo endereço.)
2. Suba a pasta inteira no mesmo local da versão antiga, substituindo o `index.html` antigo.
   Se já tem `manifest.webmanifest`, `favicon.png` e `apple-touch-icon.png` seus, **mantenha-os** e copie só o `sw.js` novo.
3. Abra o site, aperte Ctrl+Shift+R e confira Gerenciar, Biblioteca, Academia e Feituras.
4. Se algo não aparecer, não limpe os dados do navegador: confira se o endereço é o mesmo e use **Importar backup**.

Abrir clicando duas vezes no arquivo (`file://`) **não funciona** nesta estrutura. Use http(s):
hospedagem (GitHub Pages etc.) ou, no seu PC, `python3 -m http.server 8000` dentro da pasta e abra `http://localhost:8000`.

## Estrutura

```
ctonia/
├── assets/
│   ├── fonts/
│   ├── icons/
│   └── images/
├── css/
│   ├── academia-gemas.css
│   ├── academia.css
│   ├── astro.css
│   ├── biblioteca-viva.css
│   ├── corretor.css
│   ├── feituras.css
│   ├── gerenciar-extras.css
│   ├── gerenciar.css
│   ├── hub-letreiro.css
│   ├── hub-mobile.css
│   ├── hub-oraculo.css
│   ├── hub-relogio.css
│   ├── hub-themes.css
│   ├── lab-kit.css
│   ├── laboratorio-embreve.css
│   ├── laboratorio.css
│   ├── library.css
│   ├── oraculo.css
│   ├── reader.css
│   └── themes.css
├── js/
│   ├── academia/
│   │   ├── app.js
│   │   └── google-agenda.js
│   ├── annotations/
│   │   ├── bookmarks.js
│   │   ├── highlights.js
│   │   ├── markers.js
│   │   └── notes.js
│   ├── biblioteca-viva/
│   │   └── app.js
│   ├── core/
│   │   ├── app.js
│   │   ├── astro.js
│   │   ├── boot.js
│   │   ├── database.js
│   │   ├── hub-bridge.js
│   │   └── loader.js
│   ├── corretor/
│   │   └── app.js
│   ├── feituras/
│   │   └── app.js
│   ├── gerenciar/
│   │   ├── app.js
│   │   ├── google-agenda.js
│   │   └── google-drawer.js
│   ├── hub/
│   │   ├── app.js
│   │   ├── astro.js
│   │   ├── boot.js
│   │   ├── cloud-sync.js
│   │   ├── img-to-pdf.js
│   │   ├── organize-pdf.js
│   │   ├── pdf-engine.js
│   │   ├── portal.js
│   │   ├── pwa.js
│   │   ├── sign-pdf.js
│   │   ├── storage.js
│   │   ├── theme.js
│   │   ├── tools-ui.js
│   │   └── workflows.js
│   ├── laboratorio/
│   │   ├── app.js
│   │   ├── embreve.js
│   │   └── ortografia.js
│   ├── library/
│   │   ├── books.js
│   │   ├── filters.js
│   │   ├── metadata.js
│   │   ├── pdf-meta.js
│   │   └── sorting.js
│   ├── reader/
│   │   ├── book3d.js
│   │   ├── epub.js
│   │   ├── flip3d.js
│   │   ├── layout.js
│   │   ├── navigation.js
│   │   ├── pdf-links.js
│   │   ├── pdf.js
│   │   ├── reader.js
│   │   ├── rendering.js
│   │   ├── search.js
│   │   └── settings.js
│   ├── statistics/
│   │   ├── panel.js
│   │   └── reading-stats.js
│   └── sync/
│       ├── cloud-sync.js
│       ├── google-calendar-bridge.js
│       └── google-drive.js
├── modules/
│   ├── academia/
│   │   └── index.html
│   ├── biblioteca/
│   │   └── index.html
│   ├── feituras/
│   │   └── index.html
│   ├── gerenciar/
│   │   └── index.html
│   └── laboratorio/
│       ├── index.html
│       └── experimentos/
│           ├── _embreve/index.html
│           ├── biblioteca-viva/index.html
│           └── corretor/index.html
├── index.html
├── manifest.webmanifest
└── sw.js
```

## Onde mexer

| Quero mexer em… | Arquivos |
|---|---|
| Biblioteca (livros, coleções, filtros, ordenação) | `js/library/*.js`, `css/library.css` |
| Leitor PDF/EPUB, navegação, livro 3D | `js/reader/*.js`, `css/reader.css` |
| Anotações (marcações, notas, favoritos, pins) | `js/annotations/*.js` |
| Tempo de leitura / painel "Mais" | `js/statistics/*.js` |
| Sincronização Drive da Biblioteca | `js/sync/google-drive.js`, `js/sync/cloud-sync.js` |
| Estado global, banco e inicialização da Biblioteca | `js/core/app.js`, `js/core/database.js`, `js/core/boot.js` |
| Gerenciar | `js/gerenciar/app.js`, `css/gerenciar*.css`, `css/oraculo.css` |
| Academia | `js/academia/app.js`, `css/academia*.css` |
| Livro de Feituras | `js/feituras/app.js`, `css/feituras.css` |
| Portal, ferramentas de PDF, backup | `js/hub/*.js`, `css/hub-*.css` |
| Laboratório (hub, skins, experimentos) | `modules/laboratorio/*`, `js/laboratorio/*`, `js/biblioteca-viva/*`, `js/corretor/*`, `css/laboratorio*.css`, `css/lab-kit.css`, `css/biblioteca-viva.css`, `css/corretor.css` |

Para cada módulo, a ordem dos `<script>` em `modules/<nome>/index.html` é a ordem original e **importa**:
são scripts clássicos que compartilham o mesmo escopo global, como antes.

## Como os módulos são carregados

`js/core/loader.js` busca `modules/<nome>/index.html`, resolve os links relativos e coloca o resultado no iframe via
`srcdoc`. Assim cada módulo continua herdando a origem do portal (mesmos dados e `parent.*` funcionando).
O `sw.js` busca sempre a versão nova na rede e usa o cache só como reserva offline.

## Laboratório (câmara de experimentos)

O cartão **Laboratório** do portal abre uma câmara isolada: uma grade de experimentos que ainda estão em
desenvolvimento, cada um em seu próprio sub-módulo. Nada ali toca os dados reais da Biblioteca — o laboratório
grava apenas chaves próprias no `localStorage` (`ct-lab-*`).

Experimentos que já abrem:

- **Biblioteca Viva** (`modules/laboratorio/experimentos/biblioteca-viva/`): protótipo da nova biblioteca,
  com livro 3D (capa, lombada e contracapa), skins com revelação circular, manuscrito com corretor local e
  bússola de ajustes que se revela no hover.
- **Corretor Local** (`modules/laboratorio/experimentos/corretor/`): ortografia e pequenos vícios de estilo
  sem IA, com dicionário pessoal e regras desligáveis.
- **Conceitos** (Estúdio 3D, Bússola de Ajustes, Leitor Imersivo, IA Local): abrem a sala `_embreve`, que
  guarda o desenho, as funcionalidades previstas e o roteiro de cada ideia.

### Como criar um experimento novo

1. Crie `modules/laboratorio/experimentos/<nome>/index.html` com o CSS e o JS do experimento. Pode usar
   `css/lab-kit.css` para os componentes base (botões, campos, modais, toast, sigilo).
2. Acrescente um objeto em `EXPERIMENTS`, no começo de `js/laboratorio/app.js`, com `id`, `title`,
   `status` (`dev`, `proto` ou `concept`), `area`, `icon`, `description`, `tags`, `progress` e `path`.
3. Abra o Laboratório: o card aparece na grade e o sub-módulo é montado em um iframe com a mesma origem
   (logo, o `localStorage` e o `parent.*` continuam valendo).

O laboratório injeta `<base>` apontando para a pasta do experimento. Por isso, dentro dele, os caminhos são
relativos à própria pasta — por exemplo `../../../../css/lab-kit.css` e `../../../../js/laboratorio/ortografia.js`.

Chaves usadas pelos protótipos: `ct-lab-skin` e `ct-lab-recent` (Laboratório), `ct-lab-bv-v1` e
`ct-lab-bv-skin` (Biblioteca Viva), `ct-lab-corretor-v1` (Corretor Local).

Prévias estáticas: `previews/laboratorio.png`, `previews/biblioteca-viva.png` e `previews/manuscrito.png`.

## O que ainda não está dividido

- `js/gerenciar/app.js` (~125 KB) é um módulo ES com Firebase; dividir exige `import/export`, fica para uma próxima etapa.
- `js/academia/app.js` (~80 KB) segue inteiro.
- Do desenho original, **não existem hoje no código** `duplicates.js` e um CSS só de mobile para a Biblioteca;
  coleções ficam dentro de `js/library/books.js`. Quando essas funções existirem, entram como arquivos novos.
- Trechos do CSS e do astro (letreiro) repetidos nos módulos foram unificados em `css/astro.css` e `js/core/astro.js`.
