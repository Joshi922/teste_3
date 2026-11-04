        // --- 5. FERRAMENTA: IMAGEM PARA PDF ---
        function renderImgToPdf() {
            workspaceContent.innerHTML = `
                <div class="flex-1 flex bg-abyssal relative">
                    <!-- Esquerda: Upload e Grid -->
                    <div class="flex-1 editor-canvas-bg flex flex-col relative overflow-hidden">
                        
                        <!-- Toolbar Superior (Ordenação) -->
                        <div class="h-14 border-b border-night bg-indigo/50 flex items-center px-6 gap-4 z-10">
                            <span class="text-salmon font-serif uppercase tracking-wider text-xs font-bold">Arquivos Místicos</span>
                            <div class="w-px h-5 bg-night mx-2"></div>
                            <button onclick="sortFiles('asc')" class="px-3 py-1.5 rounded text-xs bg-abyssal text-mystic hover:text-luminous border border-night hover:border-luminous transition-all"><i class="fas fa-sort-alpha-down"></i> A-Z</button>
                            <button onclick="sortFiles('desc')" class="px-3 py-1.5 rounded text-xs bg-abyssal text-mystic hover:text-luminous border border-night hover:border-luminous transition-all"><i class="fas fa-sort-alpha-up"></i> Z-A</button>
                            <label class="ml-auto cursor-pointer bg-magenta hover:bg-[#c9495f] text-abyssal px-4 py-1.5 rounded text-xs font-bold uppercase transition-colors shadow-[0_0_10px_rgba(232,90,113,0.3)]">
                                <i class="fas fa-plus"></i> Adicionar
                                <input type="file" multiple accept="image/*" class="hidden" onchange="handleImageUpload(event)">
                            </label>
                        </div>

                        <!-- Grid Area -->
                        <div class="flex-1 overflow-auto p-8">
                            <div id="img-grid" class="flex flex-wrap gap-6 justify-center items-start">
                                <!-- Imagens Injetadas Aqui -->
                            </div>
                            <div id="empty-state" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                                <i class="far fa-images text-6xl text-night mb-4"></i>
                                <p class="text-mystic text-lg font-serif">Arraste runas (imagens) ou clique em adicionar</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Direita: Opções -->
                    <div class="w-80 bg-indigo border-l border-night flex flex-col z-10 shadow-[-10px_0_20px_rgba(27,19,43,0.5)]">
                        <div class="p-5 border-b border-night"><h2 class="font-serif text-lg text-salmon uppercase title-glow">Opções de Rito</h2></div>
                        
                        <div class="flex-1 p-5 overflow-y-auto space-y-6">
                            <!-- Orientação -->
                            <div>
                                <h3 class="text-xs text-night uppercase tracking-widest font-bold mb-3">Orientação</h3>
                                <div class="grid grid-cols-2 gap-2">
                                    <label class="border border-night bg-abyssal hover:border-mystic rounded p-3 text-center cursor-pointer relative group">
                                        <input type="radio" name="orientation" value="p" checked class="absolute opacity-0">
                                        <div class="w-6 h-8 border-2 border-night group-hover:border-mystic mx-auto mb-2 rounded-sm transition-colors"></div>
                                        <span class="text-xs text-mystic group-hover:text-salmon transition-colors">Retrato</span>
                                    </label>
                                    <label class="border border-night bg-abyssal hover:border-mystic rounded p-3 text-center cursor-pointer relative group">
                                        <input type="radio" name="orientation" value="l" class="absolute opacity-0">
                                        <div class="w-8 h-6 border-2 border-night group-hover:border-mystic mx-auto mb-2 rounded-sm mt-1 transition-colors"></div>
                                        <span class="text-xs text-mystic group-hover:text-salmon transition-colors">Paisagem</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Tamanho -->
                            <div>
                                <h3 class="text-xs text-night uppercase tracking-widest font-bold mb-3">Tamanho</h3>
                                <select id="pdf-size" class="w-full bg-abyssal border border-night text-salmon text-sm rounded p-2.5 outline-none focus:border-luminous transition-colors appearance-none">
                                    <option value="a4">A4 (297 x 210 mm)</option>
                                    <option value="a5">A5 (210 x 148 mm)</option>
                                    <option value="letter">Carta (279 x 216 mm)</option>
                                </select>
                            </div>

                            <!-- Margem -->
                            <div>
                                <h3 class="text-xs text-night uppercase tracking-widest font-bold mb-3">Margem</h3>
                                <select id="pdf-margin" class="w-full bg-abyssal border border-night text-salmon text-sm rounded p-2.5 outline-none focus:border-luminous transition-colors appearance-none">
                                    <option value="0">Sem Margem</option>
                                    <option value="10">Pequena</option>
                                    <option value="20">Grande</option>
                                </select>
                            </div>
                        </div>

                        <div class="p-6 border-t border-night bg-abyssal/30">
                            <button onclick="generateConvertedPdf()" class="w-full bg-magenta hover:bg-[#c9495f] text-abyssal font-bold uppercase tracking-wider py-4 rounded-lg shadow-[0_0_15px_rgba(232,90,113,0.3)] transition-all flex items-center justify-center gap-3">
                                Converter em PDF <i class="fas fa-magic"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            initSortable();
        }

        function handleImageUpload(event) {
            const files = Array.from(event.target.files);
            if(files.length === 0) return;

            document.getElementById('empty-state').style.display = 'none';

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentFiles.push({ name: file.name, data: e.target.result, id: Date.now() + Math.random() });
                    renderImgGrid();
                };
                reader.readAsDataURL(file);
            });
        }

        function renderImgGrid() {
            const grid = document.getElementById('img-grid');
            grid.innerHTML = '';
            
            if(currentFiles.length === 0) {
                document.getElementById('empty-state').style.display = 'flex';
                return;
            }

            currentFiles.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'w-36 flex flex-col gap-2 cursor-move group';
                item.dataset.id = file.id;
                item.innerHTML = `
                    <div class="relative w-full h-48 bg-abyssal border border-night rounded overflow-hidden group-hover:border-luminous transition-colors shadow-lg">
                        <img src="${file.data}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onclick="removeImg('${file.id}')" class="absolute top-1 right-1 bg-magenta text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs transition-opacity"><i class="fas fa-times"></i></button>
                        <div class="absolute bottom-0 left-0 right-0 bg-indigo/90 text-[9px] text-salmon text-center py-1 border-t border-night truncate px-1">${file.name}</div>
                    </div>
                `;
                grid.appendChild(item);
            });
        }

        function removeImg(id) {
            currentFiles = currentFiles.filter(f => f.id.toString() !== id.toString());
            renderImgGrid();
        }

        function sortFiles(order) {
            currentFiles.sort((a, b) => {
                return order === 'asc' ? a.name.localeCompare(b.name, undefined, {numeric:true,sensitivity:'base'}) : b.name.localeCompare(a.name, undefined, {numeric:true,sensitivity:'base'});
            });
            renderImgGrid();
        }

        function initSortable() {
            const grid = document.getElementById('img-grid');
            if(grid) {
                new Sortable(grid, {
                    animation: 150,
                    ghostClass: 'opacity-50',
                    onEnd: function (evt) {
                        // Reordenar array interno com base no DOM
                        const newOrder = Array.from(grid.children).map(el => el.dataset.id);
                        currentFiles = newOrder.map(id => currentFiles.find(f => f.id.toString() === id));
                    },
                });
            }
        }

        async function generateConvertedPdf() {
            if(currentFiles.length === 0) return alert("Adicione imagens primeiro!");
            
            const orientation = document.querySelector('input[name="orientation"]:checked').value;
            const size = document.getElementById('pdf-size').value;
            const margin = parseInt(document.getElementById('pdf-margin').value);

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: orientation, format: size });
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            for (let i = 0; i < currentFiles.length; i++) {
                if (i > 0) doc.addPage();
                
                const imgData = currentFiles[i].data;
                const imgProps = doc.getImageProperties(imgData);
                
                // Calcular dimensões mantendo proporção e aplicando margem
                const availWidth = pageWidth - (margin * 2);
                const availHeight = pageHeight - (margin * 2);
                
                const ratio = Math.min(availWidth / imgProps.width, availHeight / imgProps.height);
                const drawWidth = imgProps.width * ratio;
                const drawHeight = imgProps.height * ratio;
                
                // Centralizar
                const x = margin + (availWidth - drawWidth) / 2;
                const y = margin + (availHeight - drawHeight) / 2;

                doc.addImage(imgData, imgProps.fileType, x, y, drawWidth, drawHeight);
            }

            doc.save("ctonia_grimorio.pdf");
        }

