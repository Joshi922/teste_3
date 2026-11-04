        // --- 7. FERRAMENTA: ASSINAR PDF ---
        function renderSignPdf() {
            // View inicial de Upload
            workspaceContent.innerHTML = `
                <div class="flex-1 flex flex-col items-center justify-center bg-abyssal editor-canvas-bg text-center">
                    <i class="fa-solid fa-signature text-6xl text-magenta mb-6 drop-shadow-[0_0_10px_rgba(232,90,113,0.5)]"></i>
                    <h2 class="text-2xl font-serif text-salmon mb-8 uppercase tracking-widest">Assinar Artefato</h2>
                    <label class="cursor-pointer bg-magenta hover:bg-[#c9495f] text-abyssal px-8 py-4 rounded-lg font-bold text-lg uppercase transition-colors shadow-[0_0_20px_rgba(232,90,113,0.4)]">
                        Selecionar Pergaminho
                        <input type="file" class="hidden" onchange="promptSignType()">
                    </label>
                </div>
            `;
        }

        function promptSignType() {
            showModal(`
                <h3 class="text-xl font-serif text-salmon uppercase mb-8 border-b border-night pb-4">Quem selará este documento?</h3>
                
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <!-- Apenas Eu -->
                    <div onclick="hideModal(); alert('Redirecionando para editor de assinatura individual...')" class="flex-1 bg-abyssal border border-night rounded-xl p-6 cursor-pointer hover:border-luminous hover:bg-mint/20 transition-all group">
                        <div class="bg-indigo w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <i class="fas fa-user-pen text-2xl text-luminous"></i>
                        </div>
                        <button class="bg-magenta text-abyssal font-bold uppercase text-xs px-4 py-2 rounded w-full">Apenas Eu</button>
                        <p class="text-[10px] text-night mt-3">Assine com sua própria essência.</p>
                    </div>

                    <!-- Varias Pessoas -->
                    <div onclick="hideModal(); alert('Redirecionando para sistema de envio de convites...')" class="flex-1 bg-abyssal border border-night rounded-xl p-6 cursor-pointer hover:border-mystic hover:bg-indigo/50 transition-all group">
                        <div class="bg-indigo w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <i class="fas fa-users text-2xl text-mystic"></i>
                        </div>
                        <button class="border border-magenta text-magenta group-hover:bg-magenta group-hover:text-abyssal font-bold uppercase text-xs px-4 py-2 rounded w-full transition-colors">Vários Seres</button>
                        <p class="text-[10px] text-night mt-3">Convide outros espíritos para o rito.</p>
                    </div>
                </div>
                <div class="mt-6 text-[10px] text-night text-left">Documento aceito pelas forças abissais.</div>
            `);
        }
