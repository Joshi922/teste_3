# Ctônia (estrutura modular)

Mesmo sistema de antes (Hub, Biblioteca/Web Reader, Gerenciar, Academia, Livro de Feituras), mas cada parte
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
│   ├── feituras.css
│   ├── gerenciar-extras.css
│   ├── gerenciar.css
│   ├── hub-letreiro.css
│   ├── hub-mobile.css
│   ├── hub-oraculo.css
│   ├── hub-relogio.css
│   ├── hub-themes.css
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
│   ├── core/
│   │   ├── app.js
│   │   ├── astro.js
│   │   ├── boot.js
│   │   ├── database.js
│   │   ├── hub-bridge.js
│   │   └── loader.js
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
│   └── gerenciar/
│       └── index.html
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

Para cada módulo, a ordem dos `<script>` em `modules/<nome>/index.html` é a ordem original e **importa**:
são scripts clássicos que compartilham o mesmo escopo global, como antes.

## Como os módulos são carregados

`js/core/loader.js` busca `modules/<nome>/index.html`, resolve os links relativos e coloca o resultado no iframe via
`srcdoc`. Assim cada módulo continua herdando a origem do portal (mesmos dados e `parent.*` funcionando).
O `sw.js` busca sempre a versão nova na rede e usa o cache só como reserva offline.

## O que ainda não está dividido

- `js/gerenciar/app.js` (~125 KB) é um módulo ES com Firebase; dividir exige `import/export`, fica para uma próxima etapa.
- `js/academia/app.js` (~80 KB) segue inteiro.
- Do desenho original, **não existem hoje no código** `duplicates.js` e um CSS só de mobile para a Biblioteca;
  coleções ficam dentro de `js/library/books.js`. Quando essas funções existirem, entram como arquivos novos.
- Trechos do CSS e do astro (letreiro) repetidos nos módulos foram unificados em `css/astro.css` e `js/core/astro.js`.
