        function portalPlaceholder(event, name) {
            // Preserva o menu de contexto nativo do link para abrir/copiar o destino.
            if (event && (event.ctrlKey || event.metaKey || event.button === 1)) return;
            if (event) event.preventDefault();
            showModal(`<h3 class="font-serif text-xl text-salmon mb-3">${name}</h3><p class="text-mystic text-sm">Este espaço está reservado para o módulo ${name}. O link já pode ser substituído pela URL definitiva no HTML.</p><button onclick="hideModal()" class="mt-5 px-5 py-2 bg-magenta text-white rounded">Entendi</button>`);
        }

        // Estado Global
        let currentFiles = []; // Para ImgToPDF
        let savedWorkflows = []; // Para fluxos

        // --- 2. RENDERIZAÇÃO DO HUB ---
        const filtersNav = document.getElementById('filters-nav');
        const toolsGrid = document.getElementById('tools-grid');
        let currentFilter = 'Todas';

        function renderFilters() {
            filtersNav.innerHTML = '';
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = `filter-btn text-[10px] sm:text-xs md:text-sm font-semibold tracking-widest uppercase pb-2 border-b-2 transition-colors duration-300 ${cat === currentFilter ? 'active border-magenta text-salmon' : 'border-transparent text-night hover:text-salmon hover:border-mystic'}`;
                btn.innerText = cat;
                btn.onclick = () => {
                    currentFilter = cat;
                    renderFilters();
                    renderTools();
                };
                filtersNav.appendChild(btn);
            });
        }

        function renderTools() {
            toolsGrid.innerHTML = '';
            const filtered = currentFilter === 'Todas' ? toolsData : toolsData.filter(t => t.cat === currentFilter);
            
            filtered.forEach((tool, index) => {
                const card = document.createElement('div');
                card.className = `tool-card rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer fade-in group relative overflow-hidden`;
                card.style.animationDelay = `${index * 0.02}s`;
                card.onclick = () => openWorkspace(tool);
                card.innerHTML = `
                    <div class="absolute inset-0 bg-gradient-to-t from-mint/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="icon-wrapper mb-4 text-mystic transition-all duration-300 z-10 relative">
                        <i class="fa-solid ${tool.icon} text-4xl drop-shadow-[0_0_8px_rgba(59,140,136,0.5)]"></i>
                    </div>
                    <h3 class="font-serif text-base font-bold text-night mb-2 uppercase tracking-wide z-10 relative transition-colors">${tool.title}</h3>
                `;
                toolsGrid.appendChild(card);
            });
        }

        // --- 3. WORKSPACE MANAGER ---
        const hubView = document.getElementById('hub-view');
        const workspaceView = document.getElementById('workspace-view');
        const workspaceTitle = document.getElementById('workspace-title');
        const workspaceContent = document.getElementById('workspace-content');

        function openWorkspace(tool) {
            hubView.classList.add('hidden');
            workspaceView.classList.remove('hidden');
            workspaceTitle.innerText = tool.title;
            workspaceContent.innerHTML = ''; 

            if (tool.id === 'organizar') renderOrganizePdf();
            else if (tool.handler === 'imgToPdf') renderImgToPdf();
            else if (tool.handler === 'workflows') renderWorkflowsList();
            else if (tool.handler === 'signPdf') renderSignPdf();
            else if (T[tool.id]) renderTool(tool);
            else renderGeneric(tool);
        }

        function closeWorkspace() {
            workspaceView.classList.add('hidden');
            hubView.classList.remove('hidden');
            currentFiles = []; // limpar files
        }

        function renderGeneric(tool) {
            workspaceContent.innerHTML = `
                <div class="flex-1 flex flex-col items-center justify-center p-10 text-center">
                    <i class="fa-solid ${tool.icon} text-9xl text-night mb-8 opacity-50"></i>
                    <h2 class="text-3xl font-serif text-salmon mb-4 uppercase tracking-widest">${tool.title}</h2>
                    <p class="text-mystic max-w-lg mb-8">Esta ferramenta ainda está sendo desenvolvida.</p>
                </div>
            `;
        }

        // --- 4. MODAL MANAGER ---
        function showModal(html) {
            const modal = document.getElementById('global-modal');
            const content = document.getElementById('modal-content');
            content.innerHTML = html;
            modal.classList.remove('hidden');
            setTimeout(() => content.classList.remove('scale-95'), 10);
        }

        function hideModal() {
            const modal = document.getElementById('global-modal');
            const content = document.getElementById('modal-content');
            content.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 200);
        }
