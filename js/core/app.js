        // Set worker src
        if (window.pdfjsLib) { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'; }

        let library = [];
        let currentDisplayMode = 'collections'; 
        let currentActiveCollection = null; 
        let activeBookId = null; 

        let currentReaderInstance = null;
        let currentRendition = null;
        let isPdfMode = false;
        let isPdfContinuous = false;
        let isPdfBook = false, pageFlip = null, pdfBook = null, bookFlipping = false;
        let pdfObserver = null;
        let pdfDocument = null, pdfCurrentPage = 1, isRenderingPage = false;
        let pdfTextCache = [], pendingPdfPage = null, pdfSearchTerm = '', currentSelectionRects = null;
        
        let currentSelectionCfi = null, currentSelectionText = "";
        let editingAnnotationId = null, activeMenuAnnotationId = null, currentFilters = [];
        let readerSettings = { font: 'Bookerly', size: 3, theme: 'dark', scroll: false, margin: 'normal', align: 'justify', progress: 'location', anim3d: true };

        const HL_HEX = { red: '#FF4D6D', orange: '#FF9F43', yellow: '#FFE14D', green: '#34E89E', cyan: '#22D3EE', blue: '#5B8CFF', purple: '#B36BFF', pink: '#FF5FC8' };
        const colorNames = { red: 'SANGUE', orange: 'OCASO', yellow: 'OURO', green: 'MUSGO', cyan: 'LAGO', blue: 'PROFUNDEZA', purple: 'VAZIO', pink: 'ROSA NEGRA' };

        const views = {
            main: document.getElementById('main-view'), reader: document.getElementById('reader-view'),
            headerMain: document.getElementById('header-main'), headerInner: document.getElementById('header-inner-collection'),
            searchBar: document.getElementById('search-container'), collectionsGrid: document.getElementById('collections-grid'),
            booksGrid: document.getElementById('books-grid'), booksList: document.getElementById('books-list'),
            emptyState: document.getElementById('empty-state'), displayMenu: document.getElementById('display-menu-backdrop'),
            viewer: document.getElementById('viewer')
        };

        function getBookAnnotations() {
            const b = library.find(x => x.id === activeBookId);
            return (b && b.annotations) || [];
        }

        function escapeHtml(str) { return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
        function formatBytes(bytes) { if (!bytes || bytes === 0) return '0 B'; const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(1)).toString().replace('.', ',') + ' ' + sizes[i]; }
        function readAsArrayBuffer(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); }); }
        function blobToDataUrl(blob) { return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); }); }
        const normTxt = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
