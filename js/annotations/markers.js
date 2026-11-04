        function annScreenRects(an) {
            if (isPdfMode) {
                const perPage = isPdfContinuous || isPdfBook;
                const tl = perPage ? document.getElementById(`pdf-text-layer-${an.page}`) : document.getElementById('pdf-text-layer'); 
                if (!tl || (!perPage && an.page !== pdfCurrentPage) || !an.rects) return [];
                if (isPdfBook && !bookVisible().includes(an.page)) return [];
                const b = tl.getBoundingClientRect(); 
                if (isPdfBook && (b.width < 4 || b.height < 4)) return [];
                const vr = views.viewer.getBoundingClientRect();
                return an.rects.map(r => ({ left: b.left + r.x * b.width, right: b.left + (r.x + r.w) * b.width, top: b.top + r.y * b.height }))
                               .filter(r => r.top >= vr.top && r.top <= vr.bottom - 8 && (!isPdfBook || (r.left >= vr.left - 2 && r.right <= vr.right + 2)));
            }
            if (!currentRendition) return []; 
            const vr = views.viewer.getBoundingClientRect();
            for (const c of currentRendition.getContents()) { 
                if (!String(an.cfi).includes(c.cfiBase + '!')) continue; 
                try { 
                    const iframeRect = c.window.frameElement.getBoundingClientRect(); 
                    if (iframeRect.bottom < 0 || iframeRect.top > window.innerHeight) continue;

                    const ar = (document.getElementById('epub-area') || views.viewer).getBoundingClientRect();
                    return Array.from(c.range(an.cfi).getClientRects())
                        .filter(r => r.width > 1)
                        .map(r => ({ left: iframeRect.left + r.left, right: iframeRect.left + r.right, top: iframeRect.top + r.top }))
                        .filter(r => r.left >= ar.left - 2 && r.right <= ar.right + 2 && r.top >= vr.top && r.top <= vr.bottom - 8);
                } catch (e) {} 
            } return [];
        }
        
        function refreshMarkers() {
            const layer = document.getElementById('marker-layer'); if (!layer) return; layer.innerHTML = ''; if (isPdfBook && bookFlipping) return; const lr = layer.getBoundingClientRect();
            getBookAnnotations().filter(a => a.type === 'pin' || a.type === 'note').forEach(an => {
                const rects = annScreenRects(an); if (!rects.length) return; const isPin = an.type === 'pin', r = isPin ? rects[0] : rects[rects.length - 1]; const i = document.createElement('i'); i.className = isPin ? 'ph-fill ph-push-pin' : 'ph-fill ph-note'; const x = isPin ? lr.left + 3 : Math.min(r.right + 2, lr.right - 18);
                i.style.cssText = `position:absolute;left:${x - lr.left}px;top:${r.top - lr.top - (isPin ? 0 : 6)}px;font-size:${isPin ? 22 : 18}px;color:${isPin ? '#7BF0C3' : '#FFBEA6'};filter:drop-shadow(0 0 5px ${isPin ? '#7BF0C3' : '#E85A71'});pointer-events:auto;cursor:pointer;`;
                i.onclick = ev => { ev.stopPropagation(); if (isPin) openPinSheet(an.id); else openHlMenu(an.id); }; layer.appendChild(i);
            });
        }
        
        const dotsHtml = fn => Object.keys(HL_HEX).map(c => `<button data-c="${c}" onclick="${fn}('${c}')" class="w-8 h-8 rounded-full border border-black/30 hover:scale-110 transition shadow-[0_0_8px_${HL_HEX[c]}]" style="background:${HL_HEX[c]}"></button>`).join('');
        document.getElementById('hl-color-popup').innerHTML = dotsHtml('pickColor'); document.getElementById('hl-edit-colors').innerHTML = dotsHtml('changeHlColor');

