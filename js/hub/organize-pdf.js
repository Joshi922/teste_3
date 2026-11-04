        // --- ORGANIZAR PDF: miniaturas, ordem manual e ordenação crescente/decrescente ---
        let organizeFile = null;
        let organizePages = [];
        let organizeSortable = null;

        function renderOrganizePdf() {
            organizeFile = null;
            organizePages = [];
            workspaceContent.innerHTML = `
                <div class="flex-1 flex flex-col lg:flex-row min-h-0 bg-abyssal">
                    <section class="flex-1 min-w-0 flex flex-col">
                        <div class="min-h-14 px-4 md:px-6 py-3 bg-indigo/60 border-b border-night flex flex-wrap items-center gap-2">
                            <span class="font-serif uppercase tracking-wider text-salmon font-bold text-xs mr-2">Páginas do documento</span>
                            <button onclick="sortOrganizePages('asc')" class="px-3 py-2 rounded text-xs bg-abyssal text-mystic border border-night hover:border-luminous"><i class="fas fa-sort-numeric-down"></i> Ordem crescente</button>
                            <button onclick="sortOrganizePages('desc')" class="px-3 py-2 rounded text-xs bg-abyssal text-mystic border border-night hover:border-luminous"><i class="fas fa-sort-numeric-up"></i> Ordem decrescente</button>
                            <span id="organize-count" class="ml-auto text-xs text-mystic">Nenhum PDF carregado</span>
                        </div>
                        <div id="organize-stage" class="flex-1 overflow-auto p-5 md:p-8 editor-canvas-bg">
                            <div id="organize-empty" class="min-h-[300px] flex flex-col items-center justify-center text-center">
                                <i class="fas fa-file-pdf text-6xl text-night mb-5"></i>
                                <h2 class="font-serif text-xl text-salmon mb-2">Organize as páginas do seu PDF</h2>
                                <p class="text-mystic text-sm max-w-md">Carregue um PDF para visualizar todas as páginas. Arraste as miniaturas para definir a nova ordem.</p>
                            </div>
                            <div id="organize-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4"></div>
                        </div>
                    </section>
                    <aside class="w-full lg:w-80 shrink-0 bg-indigo border-t lg:border-t-0 lg:border-l border-night flex flex-col">
                        <div class="p-5 border-b border-night"><h2 class="font-serif text-lg text-salmon uppercase">Organizar PDF</h2><p class="text-xs text-mystic mt-2">A ordem exibida será a ordem do arquivo final.</p></div>
                        <div class="p-5 space-y-4 flex-1">
                            <label class="block cursor-pointer text-center bg-abyssal border border-night hover:border-luminous rounded-lg p-4 text-salmon font-semibold">
                                <i class="fas fa-folder-open mr-2"></i> Selecionar PDF
                                <input id="organize-upload" type="file" accept="application/pdf,.pdf" class="hidden" onchange="loadOrganizePdf(this.files[0])">
                            </label>
                            <div class="text-xs text-mystic leading-relaxed">• Arraste uma página para movê-la.<br>• Crescente: 1, 2, 3, 4, 5…<br>• Decrescente: última página até a primeira.<br>• O arquivo original não será alterado.</div>
                            <div id="organize-status" class="text-xs text-mystic"></div>
                        </div>
                        <div class="p-5 border-t border-night">
                            <button id="organize-export" onclick="exportOrganizedPdf()" disabled class="w-full disabled:opacity-40 bg-magenta hover:opacity-90 text-abyssal font-bold uppercase py-4 rounded-lg shadow-lg"><i class="fas fa-download mr-2"></i> Salvar PDF organizado</button>
                        </div>
                    </aside>
                </div>`;
        }

        async function loadOrganizePdf(file) {
            if (!file) return;
            if (organizeSortable) { organizeSortable.destroy(); organizeSortable = null; }
            organizeFile = file;
            organizePages = [];
            const status = document.getElementById('organize-status');
            const grid = document.getElementById('organize-grid');
            const empty = document.getElementById('organize-empty');
            const exportBtn = document.getElementById('organize-export');
            status.textContent = 'Carregando e renderizando páginas…';
            grid.innerHTML = '';
            empty.classList.add('hidden');
            exportBtn.disabled = true;
            try {
                await lib('pdfjs');
                const pdf = await pdfjsLib.getDocument({data: await buf(file)}).promise;
                for (let n = 1; n <= pdf.numPages; n++) {
                    status.textContent = `Renderizando página ${n} de ${pdf.numPages}…`;
                    const page = await pdf.getPage(n);
                    const viewport = page.getViewport({scale: 0.42});
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.ceil(viewport.width);
                    canvas.height = Math.ceil(viewport.height);
                    await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
                    organizePages.push({sourceIndex: n - 1, originalNumber: n, thumbnail: canvas.toDataURL('image/jpeg', 0.78)});
                }
                document.getElementById('organize-count').textContent = `${organizePages.length} página(s)`;
                renderOrganizePages();
                status.textContent = 'Pronto. Arraste as páginas para reorganizar.';
                exportBtn.disabled = false;
            } catch (err) {
                console.error(err);
                status.textContent = /password/i.test(err.message || '') ? 'Este PDF exige senha de abertura e não pode ser exibido sem ela.' : `Não foi possível abrir o PDF: ${err.message}`;
                empty.classList.remove('hidden');
                empty.querySelector('h2').textContent = 'Não foi possível carregar o PDF';
            }
        }

        function renderOrganizePages() {
            const grid = document.getElementById('organize-grid');
            if (!grid) return;
            grid.innerHTML = organizePages.map((p, i) => `
                <div class="organize-page bg-indigo border border-night rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-lg hover:border-luminous transition-colors" data-index="${p.sourceIndex}">
                    <div class="flex items-center justify-between text-[10px] text-mystic mb-2"><span>Posição ${i + 1}</span><span>Original ${p.originalNumber}</span></div>
                    <div class="bg-white rounded p-2 flex items-center justify-center min-h-[170px]">
                        <img src="${p.thumbnail}" alt="Página original ${p.originalNumber}" class="max-w-full max-h-64 object-contain pointer-events-none">
                    </div>
                    <div class="text-center text-xs text-salmon mt-2 font-semibold">Página ${i + 1}</div>
                </div>`).join('');
            if (organizeSortable) organizeSortable.destroy();
            organizeSortable = new Sortable(grid, {
                animation: 180,
                ghostClass: 'opacity-40',
                chosenClass: 'ring-2',
                onEnd: () => {
                    const order = Array.from(grid.children).map(el => Number(el.dataset.index));
                    organizePages = order.map(index => organizePages.find(p => p.sourceIndex === index));
                    renderOrganizePages();
                }
            });
        }

        function sortOrganizePages(direction) {
            if (!organizePages.length) return;
            organizePages.sort((a, b) => direction === 'asc' ? a.originalNumber - b.originalNumber : b.originalNumber - a.originalNumber);
            renderOrganizePages();
            const status = document.getElementById('organize-status');
            if (status) status.textContent = direction === 'asc' ? 'Páginas em ordem crescente: 1, 2, 3…' : 'Páginas em ordem decrescente.';
        }

        async function exportOrganizedPdf() {
            if (!organizeFile || !organizePages.length) return;
            const btn = document.getElementById('organize-export');
            const status = document.getElementById('organize-status');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando PDF…';
            try {
                await lib('pdflib');
                const source = await PDFLib.PDFDocument.load(await buf(organizeFile));
                const output = await PDFLib.PDFDocument.create();
                const indices = organizePages.map(p => p.sourceIndex);
                const copied = await output.copyPages(source, indices);
                copied.forEach(page => output.addPage(page));
                const bytes = await output.save();
                dl(pb(bytes), `${bn(organizeFile)}_organizado.pdf`);
                status.textContent = 'PDF organizado gerado e baixado.';
            } catch (err) {
                console.error(err);
                alert('Não foi possível salvar o PDF: ' + err.message);
                status.textContent = 'Falha ao gerar o arquivo.';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-download mr-2"></i> Salvar PDF organizado';
            }
        }
