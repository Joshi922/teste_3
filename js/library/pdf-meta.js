        /* Metadados do PDF (título, autor, série, volume, coleção) */
        async function applyPdfMeta(book, pdf) {
            try {
                const md = await pdf.getMetadata(), i = md.info || {}, c = i.Custom || {};
                const cl = v => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim() : '');
                const title = cl(i.Title), author = cl(i.Author), subj = cl(i.Subject), kw = cl(i.Keywords);
                const forja = /Ct[oô]nia/i.test(cl(i.Producer)) || !!(c.CtoniaSeries || c.CtoniaVolume || c.CtoniaCollection || c.CtoniaGenre || c.CtoniaSubgenre);
                let series = cl(c.CtoniaSeries), volume = cl(c.CtoniaVolume), coll = cl(c.CtoniaCollection), genre = cl(c.CtoniaGenre), sub = cl(c.CtoniaSubgenre);
                const mS = subj.match(/(?:^|\|)\s*S[ée]rie:\s*([^|]+)/i), mV = subj.match(/(?:^|\|)\s*Volume:\s*([^|]+)/i);
                if (!series && mS) series = mS[1].trim();
                if (!volume && mV) volume = mV[1].trim();
                if (!coll && forja && kw) coll = kw;
                const migrating = book.metaV === 2 && book.metaX !== 1; // livro já lido antes dos campos novos
                if (!migrating || book.author === 'Desconhecido') { if (title) book.title = title; if (author) book.author = author; }
                if (migrating) {
                    // não atropela edições manuais: só completa o que está vazio (coleção só se ainda era a série)
                    if (coll && (!book.collection || book.collection === series)) book.collection = coll;
                    if (series && !book.series) book.series = series;
                    if (volume && !book.volume) book.volume = volume;
                    if (genre && !book.genre) book.genre = genre;
                    if (sub && !book.subgenre) book.subgenre = sub;
                } else {
                    if (coll) book.collection = coll;
                    if (series) book.series = series;
                    if (volume) book.volume = volume;
                    if (genre) book.genre = genre;
                    if (sub) book.subgenre = sub;
                }
                book.subject = subj.split('|')[0].trim(); book.keywords = kw;
            } catch (e) { console.warn('Metadados PDF', e); }
            book.metaV = 2; book.metaX = 1; libDirty = true;
        }
        async function migrateLocalPdfMeta() {
            let n = 0;
            for (const b of library.filter(x => x.type === 'pdf' && x.metaX !== 1)) {
                try {
                    const blob = await DB.get('files', b.id);
                    if (!blob) { if (!b.driveId) { b.metaV = 2; b.metaX = 1; } continue; }
                    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await readAsArrayBuffer(blob)) }).promise;
                    await applyPdfMeta(b, pdf); pdf.destroy(); n++;
                } catch (e) { b.metaV = 2; b.metaX = 1; }
            }
            if (n) { renderCurrentView(); flushLibrary(); }
        }
        async function enrichBook(book, buf) {
            try {
                if (book.type === 'epub') { const i = await extractEpubInfo(buf); if (i.title) book.title = i.title; if (i.author) book.author = i.author; if (i.coverUrl) book.coverUrl = i.coverUrl; }
                else { const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; await applyPdfMeta(book, pdf); const page = await pdf.getPage(1); const vp = page.getViewport({ scale: 0.5 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; book.coverUrl = c.toDataURL('image/jpeg', 0.8); pdf.destroy(); }
            } catch (e) {}
            book.enriched = true; libDirty = true;
        }
        async function getBookBuffer(book) {
            if (book.file) return readAsArrayBuffer(book.file);
            let blob = null; try { blob = await DB.get('files', book.id); } catch (e) {}
            if (!blob && book.driveId) {
                blob = await (await driveApi(`https://www.googleapis.com/drive/v3/files/${book.driveId}?alt=media&supportsAllDrives=true`)).blob();
                try { await DB.put('files', blob, book.id); } catch (e) {}
                book.file = blob; const buf = await readAsArrayBuffer(blob);
                if (!book.enriched || (book.type === 'pdf' && book.metaX !== 1)) { await enrichBook(book, buf.slice(0)); renderCurrentView(); }
                return buf;
            }
            if (!blob && book.cloudFileId) { blob = await (await driveApi(`https://www.googleapis.com/drive/v3/files/${book.cloudFileId}?alt=media`)).blob(); try { await DB.put('files', blob, book.id); } catch (e) {} book.file = blob; return readAsArrayBuffer(blob); }
            if (!blob) throw new Error('O fragmento sumiu do cofre local. Invoque-o novamente no (+).');
            book.file = blob; return readAsArrayBuffer(blob);
        }
