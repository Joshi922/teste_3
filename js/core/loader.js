        function ctoniaEmbedAtmosphere() {
            // Reaproveita o mesmo fundo vivo do app nos iframes (Biblioteca e Gerenciar).
            const css = document.getElementById('ctonia-flow-bg').textContent;
            const js = document.getElementById('ctonia-flow-js').textContent;
            const extra = 'html:is(.light,:not(.light)):is(.hub-light,:not(.hub-light)) :is(#app,main){background:transparent!important;background-color:transparent!important}';
            return '<style id="ctonia-embedded-atmosphere">' + css + extra + '</style><script>' + js + '<\/script>';
        }

        // Carrega um módulo (modules/<nome>/index.html) e o injeta em um iframe via srcdoc.
        // srcdoc herda a origem desta página: localStorage/IndexedDB continuam exatamente os mesmos de antes
        // e os módulos seguem falando com a página principal por "parent". Os links relativos (CSS/JS) viram absolutos.
        async function ctoniaMountModule(frame, path, withAtmosphere) {
            const url = new URL(path, document.baseURI).href;
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) throw new Error('HTTP ' + res.status + ' ao carregar ' + path);
            let doc = await res.text();
            doc = doc.replace(/(<(?:link|script)\b[^>]*?\b(?:src|href)=")(?!https?:|\/\/|data:|#)([^"]+)(")/gi, (m, a, p, c) => a + new URL(p, url).href + c);
            if (withAtmosphere) doc = doc.replace(/<\/head>/i, () => ctoniaEmbedAtmosphere() + '</head>');
            frame.addEventListener('load', function syncEmbeddedTheme() {
                try { const isLight = document.documentElement.classList.contains('light');
                    frame.contentDocument.documentElement.classList.toggle('light', isLight);
                    frame.contentDocument.documentElement.classList.toggle('dark', !isLight);
                } catch (e) {}
            }, { once: true });
            frame.srcdoc = doc;
        }
        function ctoniaModuleError(frame, path, err) {
            console.error('[Ctônia] Falha ao carregar o módulo', path, err);
            frame.srcdoc = '<body style="margin:0;display:grid;place-items:center;height:100vh;background:#1B132B;color:#FFBEA6;font:15px sans-serif;text-align:center;padding:24px">Não foi possível carregar o módulo (' + path + ').<br>Abra o site por http(s) e confira a conexão. Feche e abra de novo para tentar outra vez.</body>';
        }
        let ctoniaLibraryLoaded = false;
        function openCtoniaLibrary() {
            const overlay = document.getElementById('ctonia-library-overlay');
            const frame = document.getElementById('ctonia-library-frame');
            if (!ctoniaLibraryLoaded) {
                ctoniaLibraryLoaded = true;
                ctoniaMountModule(frame, 'modules/biblioteca/index.html', true).catch(err => { ctoniaLibraryLoaded = false; ctoniaModuleError(frame, 'modules/biblioteca/index.html', err); });
            }
            document.getElementById('portal-view').classList.add('hidden');
            document.getElementById('hub-view').classList.add('hidden');
            document.getElementById('workspace-view').classList.add('hidden');
            document.getElementById('ctonia-manager-overlay').classList.add('hidden');
            document.getElementById('ctonia-laboratorio-overlay').classList.add('hidden');
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            document.body.classList.add('overflow-hidden');
        }
        function closeCtoniaLibrary() {
            const overlay = document.getElementById('ctonia-library-overlay');
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.getElementById('portal-view').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        let ctoniaManagerLoaded = false;
        function openCtoniaManager() {
            const overlay = document.getElementById('ctonia-manager-overlay');
            const frame = document.getElementById('ctonia-manager-frame');
            if (!ctoniaManagerLoaded) {
                ctoniaManagerLoaded = true;
                ctoniaMountModule(frame, 'modules/gerenciar/index.html', true).catch(err => { ctoniaManagerLoaded = false; ctoniaModuleError(frame, 'modules/gerenciar/index.html', err); });
            }
            document.getElementById('portal-view').classList.add('hidden');
            document.getElementById('hub-view').classList.add('hidden');
            document.getElementById('workspace-view').classList.add('hidden');
            document.getElementById('ctonia-library-overlay').classList.add('hidden');
            document.getElementById('ctonia-laboratorio-overlay').classList.add('hidden');
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            document.body.classList.remove('overflow-hidden');
            document.body.classList.add('overflow-hidden');
        }
        function closeCtoniaManager() {
            const overlay = document.getElementById('ctonia-manager-overlay');
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.getElementById('portal-view').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        let ctoniaAcademiaLoaded = false;
        function openCtoniaAcademia() {
            const overlay = document.getElementById('ctonia-academia-overlay');
            const frame = document.getElementById('ctonia-academia-frame');
            if (!ctoniaAcademiaLoaded) {
                ctoniaAcademiaLoaded = true;
                ctoniaMountModule(frame, 'modules/academia/index.html', false).catch(err => { ctoniaAcademiaLoaded = false; ctoniaModuleError(frame, 'modules/academia/index.html', err); });
            }
            ['portal-view','hub-view','workspace-view','ctonia-manager-overlay','ctonia-library-overlay','ctonia-laboratorio-overlay'].forEach(id => document.getElementById(id).classList.add('hidden'));
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            document.body.classList.add('overflow-hidden');
        }
        function closeCtoniaAcademia() {
            const overlay = document.getElementById('ctonia-academia-overlay');
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.getElementById('portal-view').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !document.getElementById('ctonia-academia-overlay').classList.contains('hidden')) closeCtoniaAcademia();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                const labOverlay = document.getElementById('ctonia-laboratorio-overlay');
                const academiaOverlay = document.getElementById('ctonia-academia-overlay');
                if (labOverlay && !labOverlay.classList.contains('hidden')) closeCtoniaLaboratorio();
                else if (academiaOverlay && !academiaOverlay.classList.contains('hidden')) closeCtoniaAcademia();
            }
        });

        // LABORATÓRIO: câmara de experimentos, carregada como um módulo normal.
        let ctoniaLaboratorioLoaded = false;
        function openCtoniaLaboratorio() {
            const overlay = document.getElementById('ctonia-laboratorio-overlay');
            const frame = document.getElementById('ctonia-laboratorio-frame');
            if (!overlay || !frame) return;
            if (!ctoniaLaboratorioLoaded) {
                ctoniaLaboratorioLoaded = true;
                ctoniaMountModule(frame, 'modules/laboratorio/index.html', true)
                    .catch(err => { ctoniaLaboratorioLoaded = false; ctoniaModuleError(frame, 'modules/laboratorio/index.html', err); });
            }
            ['portal-view','hub-view','workspace-view','ctonia-manager-overlay','ctonia-library-overlay','ctonia-academia-overlay','ctonia-medicoes-overlay'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            document.body.classList.add('overflow-hidden');
        }
        function closeCtoniaLaboratorio() {
            const overlay = document.getElementById('ctonia-laboratorio-overlay');
            const frame = document.getElementById('ctonia-laboratorio-frame');
            if (!overlay) return;
            // se havia um experimento aberto, volta à grade antes de sair
            try { if (frame && frame.contentWindow && typeof frame.contentWindow.labCloseExperiment === 'function') frame.contentWindow.labCloseExperiment(); } catch (e) {}
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            const portal = document.getElementById('portal-view');
            if (portal) portal.classList.remove('hidden');
            document.body.classList.remove('overflow-hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        let ctoniaMedicoesLoaded = false;
        function openCtoniaMedicoes() {
            const overlay = document.getElementById('ctonia-medicoes-overlay');
            const frame = document.getElementById('ctonia-medicoes-frame');
            if (!ctoniaMedicoesLoaded) {
                ctoniaMedicoesLoaded = true;
                ctoniaMountModule(frame, 'modules/feituras/index.html', false).catch(err => { ctoniaMedicoesLoaded = false; ctoniaModuleError(frame, 'modules/feituras/index.html', err); });
            }
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        }
        function closeCtoniaMedicoes() {
            const overlay = document.getElementById('ctonia-medicoes-overlay');
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            try { const mf = document.getElementById('ctonia-manager-frame').contentWindow; if (mf && mf.ctRenderMedCard) mf.ctRenderMedCard(); } catch(e) {}
        }
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                const libraryOverlay = document.getElementById('ctonia-library-overlay');
                const managerOverlay = document.getElementById('ctonia-manager-overlay');
                const medOverlay = document.getElementById('ctonia-medicoes-overlay');
                if (medOverlay && !medOverlay.classList.contains('hidden')) closeCtoniaMedicoes();
                else if (libraryOverlay && !libraryOverlay.classList.contains('hidden')) closeCtoniaLibrary();
                else if (managerOverlay && !managerOverlay.classList.contains('hidden')) closeCtoniaManager();
            }
        });
