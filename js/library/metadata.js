        async function coverBlobToSmallDataUrl(blob) {
            const original = await blobToDataUrl(blob);
            try { const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = original; }); const canvas = document.createElement('canvas'); const scale = Math.min(1, 300 / img.naturalWidth); canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); return canvas.toDataURL('image/jpeg', 0.85); } catch (_) { return original; }
        }

        async function extractEpubInfo(arrayBuffer) {
            const zip = await JSZip.loadAsync(arrayBuffer); const parser = new DOMParser(); const info = { title: null, author: null, coverUrl: null };
            try {
                const containerFile = zip.file('META-INF/container.xml'); if (!containerFile) return info;
                const containerDoc = parser.parseFromString(await containerFile.async('string'), 'application/xml');
                const opfPath = containerDoc.getElementsByTagName('rootfile')[0].getAttribute('full-path');
                const opf = parser.parseFromString(await (zip.file(opfPath) || zip.file(decodeURIComponent(opfPath))).async('string'), 'application/xml');
                const getTag = name => { const el = opf.getElementsByTagNameNS('*', name)[0]; return el ? el.textContent.trim() : null; };
                info.title = getTag('title'); info.author = getTag('creator');
                const items = Array.from(opf.getElementsByTagNameNS('*', 'item'));
                let coverItem = items.find(i => (i.getAttribute('properties') || '').includes('cover-image'));
                if (!coverItem) { const metaCover = Array.from(opf.getElementsByTagNameNS('*', 'meta')).find(m => m.getAttribute('name') === 'cover'); if (metaCover) coverItem = items.find(i => i.getAttribute('id') === metaCover.getAttribute('content')); }
                if (!coverItem) coverItem = items.find(i => (i.getAttribute('media-type') || '').startsWith('image/') && /cover|capa/i.test(i.getAttribute('id') + i.getAttribute('href')));
                if (coverItem) { const href = coverItem.getAttribute('href'); const baseDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''; const normalize = path => path.split('/').reduce((a, p) => { if(p==='..')a.pop(); else if(p!=='.'&&p)a.push(p); return a; }, []).join('/'); const f = zip.file(normalize(baseDir + href)) || zip.file(normalize(baseDir + decodeURIComponent(href))); if (f) info.coverUrl = await coverBlobToSmallDataUrl(await f.async('blob')); }
            } catch(e) { console.warn("Erro metadados", e); }
            return info;
        }

        window.handleFileUpload = async function(event) {
            const files = Array.from(event.target.files || []); event.target.value = '';
            for (const file of files) {
                const ext = file.name.split('.').pop().toLowerCase(); if (ext !== 'epub' && ext !== 'pdf') continue;
                const bookData = { id: Date.now().toString() + Math.random().toString(36).slice(2), file: file, size: file.size, type: ext, title: file.name.replace(/\.[^/.]+$/, ""), author: 'Desconhecido', coverUrl: null, collection: '', volume: '', addedAt: Date.now(), annotations: [] };
                try { await DB.put('files', file, bookData.id); } catch (e) {}
                if (ext === 'epub') {
                    try { const buf = await readAsArrayBuffer(file); const info = await extractEpubInfo(buf); if(info.title) bookData.title = info.title; if(info.author) bookData.author = info.author; if(info.coverUrl) bookData.coverUrl = info.coverUrl; } catch(e){}
                } else if (ext === 'pdf') {
                    try { const buf = await readAsArrayBuffer(file); const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; await applyPdfMeta(bookData, pdf); const page = await pdf.getPage(1); const viewport = page.getViewport({ scale: 0.5 }); const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height; await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise; bookData.coverUrl = canvas.toDataURL('image/jpeg', 0.8); pdf.destroy(); } catch(e){}
                }
                library.push(bookData);
            }
            renderCurrentView();
        }
