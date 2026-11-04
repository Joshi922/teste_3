        // --- 1. DADOS ---
        const categories = [
            "Todas", "Organizar PDF", "Otimizar PDF", "Converter PDF", "Editar PDF", "Segurança de PDF", "Fluxos de trabalho"
        ];

        const toolsData = [
            // Organizar
            { id: 'juntar', title: 'Juntar PDF', cat: 'Organizar PDF', icon: 'fa-object-group' },
            { id: 'dividir', title: 'Dividir PDF', cat: 'Organizar PDF', icon: 'fa-cut' },
            { id: 'organizar', title: 'Organizar PDF', cat: 'Organizar PDF', icon: 'fa-layer-group' },
            { id: 'digitalize', title: 'Digitalizar para PDF', cat: 'Organizar PDF', icon: 'fa-print' },
            // Otimizar
            { id: 'comprimir', title: 'Comprimir PDF', cat: 'Otimizar PDF', icon: 'fa-compress-arrows-alt' },
            { id: 'reparar', title: 'Reparar PDF', cat: 'Otimizar PDF', icon: 'fa-wrench' },
            { id: 'ocr', title: 'OCR PDF', cat: 'Otimizar PDF', icon: 'fa-eye' },
            // Converter
            { id: 'jpg-pdf', title: 'JPG para PDF', cat: 'Converter PDF', icon: 'fa-file-image', handler: 'imgToPdf' },
            { id: 'word-pdf', title: 'WORD para PDF', cat: 'Converter PDF', icon: 'fa-file-word' },
            { id: 'ppt-pdf', title: 'POWERPOINT para PDF', cat: 'Converter PDF', icon: 'fa-file-powerpoint' },
            { id: 'excel-pdf', title: 'EXCEL para PDF', cat: 'Converter PDF', icon: 'fa-file-excel' },
            { id: 'html-pdf', title: 'HTML para PDF', cat: 'Converter PDF', icon: 'fa-file-code' },
            { id: 'pdf-jpg', title: 'PDF para JPG', cat: 'Converter PDF', icon: 'fa-file-image' },
            { id: 'pdf-word', title: 'PDF para WORD', cat: 'Converter PDF', icon: 'fa-file-word' },
            { id: 'pdf-ppt', title: 'PDF para POWERPOINT', cat: 'Converter PDF', icon: 'fa-file-powerpoint' },
            { id: 'pdf-excel', title: 'PDF para EXCEL', cat: 'Converter PDF', icon: 'fa-file-excel' },
            { id: 'pdf-pdfa', title: 'PDF para PDF/A', cat: 'Converter PDF', icon: 'fa-file-shield' },
            // Editar
            { id: 'editar-pdf', title: 'Editar PDF', cat: 'Editar PDF', icon: 'fa-pen-to-square' },
            { id: 'marca-dagua', title: 'Marca d\'água', cat: 'Editar PDF', icon: 'fa-stamp' },
            { id: 'rodar', title: 'Rodar PDF', cat: 'Editar PDF', icon: 'fa-rotate-right' },
            { id: 'numeros', title: 'Números de página', cat: 'Editar PDF', icon: 'fa-list-ol' },
            { id: 'recortar', title: 'Recortar PDF', cat: 'Editar PDF', icon: 'fa-crop-simple' },
            { id: 'metadados', title: 'Metadados do PDF', cat: 'Editar PDF', icon: 'fa-tags' },
            { id: 'formularios', title: 'Formulários PDF', cat: 'Editar PDF', icon: 'fa-table-list' },
            // Segurança
            { id: 'assinar', title: 'Assinar PDF', cat: 'Segurança de PDF', icon: 'fa-signature', handler: 'signPdf' },
            { id: 'desbloquear', title: 'Desbloquear PDF', cat: 'Segurança de PDF', icon: 'fa-unlock' },
            { id: 'proteger', title: 'Proteger PDF', cat: 'Segurança de PDF', icon: 'fa-lock' },
            { id: 'comparar', title: 'Comparar PDF', cat: 'Segurança de PDF', icon: 'fa-code-compare' },
            { id: 'ocultar', title: 'Ocultar PDF', cat: 'Segurança de PDF', icon: 'fa-eye-slash' },
            // Fluxos
            { id: 'fluxos', title: 'Fluxos de trabalho', cat: 'Fluxos de trabalho', icon: 'fa-diagram-project', handler: 'workflows' },
        ];

        // Portal inicial: destinos configuráveis para os próximos módulos.
        // Os cartões Biblioteca e Explorar são links reais (menu de contexto do navegador habilitado),
        // atualmente com destinos internos provisórios até que as URLs definitivas sejam definidas.
        function enterPdfHub() {
            document.getElementById('portal-view').classList.add('hidden');
            const hub = document.getElementById('hub-view');
            hub.classList.remove('hidden');
            hub.classList.add('flex');
            window.scrollTo({top:0, behavior:'smooth'});
        }
