        // --- 6. FERRAMENTA: FLUXOS DE TRABALHO ---
        function renderWorkflowsList() {
            let listHtml = savedWorkflows.length === 0 ? `
                <div class="flex flex-col items-center justify-center p-12 opacity-70">
                    <i class="fa-solid fa-diagram-project text-6xl text-night mb-4"></i>
                    <p class="text-mystic">Nenhum rito criado ainda.</p>
                </div>
            ` : `
                <div class="w-full max-w-4xl mx-auto space-y-3 mt-6">
                    ${savedWorkflows.map((w, idx) => `
                        <div class="bg-indigo border border-night rounded p-4 flex items-center justify-between hover:border-mystic transition-colors cursor-pointer" onclick="runWorkflow(${idx})">
                            <div class="flex items-center gap-4">
                                <div class="bg-abyssal w-8 h-8 rounded flex items-center justify-center text-night border border-night font-bold">${idx+1}</div>
                                <div>
                                    <h4 class="text-salmon font-bold font-serif uppercase">${w.name}</h4>
                                    <div class="text-[10px] text-mystic flex items-center gap-2 mt-1">
                                        ${w.steps.map((s, i) => `<span>${s.toolTitle}</span>${i < w.steps.length-1 ? ' <i class="fas fa-arrow-right text-night"></i> ' : ''}`).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button class="text-luminous hover:text-white" onclick="event.stopPropagation(); runWorkflow(${idx})"><i class="fas fa-play"></i></button>
                                <button class="text-magenta hover:text-white" onclick="event.stopPropagation(); deleteWorkflow(${idx})"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            workspaceContent.innerHTML = `
                <div class="flex-1 bg-abyssal p-8 overflow-y-auto">
                    <div class="max-w-4xl mx-auto">
                        <div class="bg-indigo border border-night p-6 rounded-lg mb-8 shadow-xl">
                            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div class="text-left">
                                    <h2 class="text-2xl font-serif text-salmon title-glow uppercase mb-2">Fluxos de Trabalho</h2>
                                    <p class="text-sm text-mystic">Simplifique rituais conectando magias em um único fluxo automatizado.</p>
                                </div>
                                <button onclick="renderCreateWorkflow()" class="bg-magenta hover:bg-[#c9495f] text-abyssal px-6 py-3 rounded font-bold uppercase tracking-wide transition-colors whitespace-nowrap shadow-[0_0_15px_rgba(232,90,113,0.3)]">
                                    Criar Novo Fluxo
                                </button>
                            </div>
                        </div>
                        
                        <h3 class="text-night font-serif uppercase tracking-widest border-b border-night pb-2">Meus Fluxos Guardados</h3>
                        ${listHtml}
                    </div>
                </div>
            `;
        }

        // --- CRIAR FLUXO ---
        let tempWorkflowSteps = [];
        
        function renderCreateWorkflow() {
            tempWorkflowSteps = [];
            
            // Gerar opções do select
            const selectOptions = toolsData.filter(t => t.id !== 'fluxos').map(t => `<option value="${t.id}">${t.title}</option>`).join('');

            workspaceContent.innerHTML = `
                <div class="flex-1 bg-abyssal p-8 overflow-y-auto flex flex-col md:flex-row gap-8">
                    
                    <!-- Form Esquerda -->
                    <div class="w-full md:w-1/2 bg-indigo border border-night p-6 rounded-lg self-start">
                        <h3 class="text-salmon font-serif uppercase tracking-wider mb-6 border-b border-night pb-2">Seleção de Artes</h3>
                        
                        <div class="mb-6">
                            <label class="block text-xs text-night uppercase tracking-wider mb-2">Nome do Rito (Fluxo):</label>
                            <input type="text" id="wf-name" placeholder="Ex: Converter e Proteger" class="w-full bg-abyssal border border-night rounded p-3 text-salmon text-sm outline-none focus:border-luminous">
                        </div>

                        <div class="mb-4">
                            <label class="block text-xs text-night uppercase tracking-wider mb-2">Selecionar Magia:</label>
                            <select id="wf-tool-select" onchange="updateWfFields()" class="w-full bg-abyssal border border-night rounded p-3 text-salmon text-sm outline-none focus:border-luminous appearance-none">
                                <option value="" disabled selected>Escolha um feitiço...</option>
                                ${selectOptions}
                            </select>
                        </div>
                        
                        <!-- Dynamic Fields Based on Selection -->
                        <div id="wf-dynamic-fields" class="mb-6 space-y-4"></div>

                        <button onclick="addStepToWorkflow()" class="w-full border border-magenta text-magenta hover:bg-magenta hover:text-abyssal px-4 py-2 rounded uppercase text-xs font-bold transition-colors">
                            + Adicionar Etapa
                        </button>
                    </div>

                    <!-- Previsao Direita -->
                    <div class="w-full md:w-1/2 bg-abyssal border border-night p-6 rounded-lg self-start">
                         <div class="flex justify-between items-end border-b border-night pb-2 mb-6">
                            <h3 class="text-salmon font-serif uppercase tracking-wider">Pré-visualização do Rito</h3>
                            <button onclick="tempWorkflowSteps=[]; renderWfPreview()" class="text-xs text-magenta hover:text-salmon underline">Limpar rito</button>
                        </div>
                        
                        <div id="wf-preview-list" class="space-y-4 min-h-[200px]">
                            <p class="text-xs text-night italic">Adicione feitiços para começar a forjar.</p>
                        </div>

                        <div class="mt-8 pt-4 border-t border-night text-right">
                            <button onclick="saveWorkflow()" class="bg-luminous hover:bg-white text-abyssal px-6 py-3 rounded font-bold uppercase tracking-wide transition-colors shadow-[0_0_15px_rgba(123,240,195,0.2)]">
                                Guardar Fluxo
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        function updateWfFields() {
            const select = document.getElementById('wf-tool-select');
            const fieldsContainer = document.getElementById('wf-dynamic-fields');
            const toolId = select.value;
            
            fieldsContainer.innerHTML = '';
            
            if (toolId === 'jpg-pdf') {
                fieldsContainer.innerHTML = `
                    <div>
                        <label class="block text-xs text-night mb-1">Orientação:</label>
                        <select id="wf-opt-orient" class="w-full bg-abyssal border border-night text-mystic text-xs rounded p-2"><option>Retrato</option><option>Paisagem</option></select>
                    </div>
                `;
            } else if (toolId === 'proteger') {
                fieldsContainer.innerHTML = `
                    <div>
                        <label class="block text-xs text-night mb-1">Senha de Proteção:</label>
                        <input type="password" id="wf-opt-pass" class="w-full bg-abyssal border border-night text-mystic text-xs rounded p-2" placeholder="Sua senha secreta">
                    </div>
                `;
            } else {
                fieldsContainer.innerHTML = `<p class="text-xs text-night italic">Processamento automático selecionado.</p>`;
            }
        }

        function addStepToWorkflow() {
            const select = document.getElementById('wf-tool-select');
            const toolId = select.value;
            if(!toolId) return;

            const tool = toolsData.find(t => t.id === toolId);
            let configText = [];

            if (toolId === 'jpg-pdf') configText.push(`Orientação: ${document.getElementById('wf-opt-orient').value}`);
            if (toolId === 'proteger') configText.push(`Senha Definiida`);

            tempWorkflowSteps.push({
                toolId: toolId,
                toolTitle: tool.title,
                icon: tool.icon,
                configText: configText
            });

            renderWfPreview();
        }

        function renderWfPreview() {
            const container = document.getElementById('wf-preview-list');
            if(tempWorkflowSteps.length === 0) {
                container.innerHTML = `<p class="text-xs text-night italic">Adicione feitiços para começar a forjar.</p>`;
                return;
            }

            container.innerHTML = tempWorkflowSteps.map((step, idx) => `
                <div class="flex gap-4 items-start">
                    <div class="bg-indigo w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-salmon font-bold shrink-0 mt-1">${idx+1}</div>
                    <div class="flex-1">
                        <div class="text-sm font-bold text-salmon flex items-center gap-2"><i class="fa-solid ${step.icon} text-mystic"></i> ${step.toolTitle}</div>
                        ${step.configText.length > 0 ? `<div class="text-[10px] text-night mt-1">${step.configText.join(' | ')}</div>` : ''}
                    </div>
                </div>
            `).join('<div class="h-4 border-l border-night ml-3"></div>');
        }

        function saveWorkflow() {
            const name = document.getElementById('wf-name').value;
            if(!name || tempWorkflowSteps.length === 0) return alert("Dê um nome ao fluxo e adicione etapas.");
            
            savedWorkflows.push({ name: name, steps: tempWorkflowSteps });
            renderWorkflowsList();
            
            showModal(`
                <div class="text-luminous mb-4"><i class="fas fa-check-circle text-5xl"></i></div>
                <h3 class="text-xl font-serif text-salmon uppercase mb-2">Rito Criado!</h3>
                <p class="text-mystic text-sm mb-6">O fluxo de magia foi guardado com sucesso no seu grimório.</p>
                <button onclick="hideModal()" class="bg-indigo border border-night text-salmon px-6 py-2 rounded hover:bg-abyssal transition-colors">Continuar</button>
            `);
        }

        function deleteWorkflow(idx) {
            savedWorkflows.splice(idx, 1);
            renderWorkflowsList();
        }

        // --- EXECUTAR FLUXO ---
        function runWorkflow(idx) {
            const w = savedWorkflows[idx];
            
            workspaceContent.innerHTML = `
                <div class="flex-1 flex flex-col items-center justify-center bg-abyssal p-8 text-center relative editor-canvas-bg">
                    
                    <h2 class="text-6xl font-bold text-indigo opacity-20 absolute top-20 font-serif">${idx+1}</h2>
                    
                    <div class="z-10 bg-indigo border border-night rounded-full px-6 py-2 flex items-center gap-3 text-xs mb-8 shadow-lg">
                        ${w.steps.map((s, i) => `
                            <span class="text-salmon font-bold"><i class="fa-solid ${s.icon} text-mystic"></i> ${s.toolTitle}</span>
                            ${i < w.steps.length-1 ? '<i class="fas fa-arrow-right text-night"></i>' : ''}
                        `).join('')}
                    </div>

                    <label class="z-10 cursor-pointer bg-magenta hover:bg-[#c9495f] text-abyssal px-10 py-5 rounded-lg font-bold text-xl uppercase transition-colors shadow-[0_0_30px_rgba(232,90,113,0.4)] flex flex-col items-center gap-2">
                        <span>Selecionar Arquivos</span>
                        <span class="text-[10px] font-normal tracking-widest text-abyssal/70">PARA O RITUAL</span>
                        <input type="file" class="hidden" onchange="processWorkflow(${idx})">
                    </label>
                    <p class="mt-4 text-xs text-night z-10">ou arraste para o círculo mágico</p>
                </div>
            `;
        }

        function processWorkflow(idx) {
            // Simular processamento e ir para sucesso
            const w = savedWorkflows[idx];
            
            workspaceContent.innerHTML = `
                <div class="flex-1 flex flex-col items-center p-12 bg-abyssal overflow-y-auto">
                    <h2 class="text-3xl font-serif text-salmon title-glow mb-8 text-center">Seu rito foi processado com sucesso.</h2>
                    
                    <button class="bg-luminous hover:bg-white text-abyssal px-12 py-4 rounded-lg font-bold text-xl uppercase transition-colors shadow-[0_0_30px_rgba(123,240,195,0.4)] flex items-center gap-3 mb-10">
                        <i class="fas fa-download"></i> Descarregar
                    </button>

                    <div class="w-full max-w-3xl bg-indigo border border-night rounded-lg p-6 mb-6">
                        <h4 class="text-night uppercase tracking-widest text-xs font-bold mb-4">Registro do Rito Executado</h4>
                        <div class="flex items-center justify-between text-xs font-bold bg-abyssal rounded p-4 border border-night/50 text-mystic">
                            ${w.steps.map((s, i) => `
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid ${s.icon}"></i> <span>${s.toolTitle}</span>
                                </div>
                                ${i < w.steps.length-1 ? '<i class="fas fa-chevron-right text-night/50"></i>' : ''}
                            `).join('')}
                        </div>
                    </div>

                    <div class="w-full max-w-3xl bg-mint/20 border border-mint rounded-lg p-6">
                        <h4 class="text-luminous font-bold mb-2">Seguro. Privado. Sob seu controle.</h4>
                        <p class="text-xs text-mystic leading-relaxed">As energias manipuladas nesta câmara não são retidas. Os artefatos são dissipados no éter (excluídos) automaticamente após 2 horas terrestres.</p>
                    </div>
                </div>
            `;
        }

