        window.addBookmark = function() {
            const cfi = isPdfMode ? `page-${pdfCurrentPage}` : currentRendition.currentLocation()?.start.cfi; if(!cfi) return;
            const b = library.find(x => x.id === activeBookId); const exists = b.annotations.find(a => a.type === 'bookmark' && a.cfi === cfi);
            const icon = document.getElementById('bookmark-icon');
            if(exists) { b.annotations = b.annotations.filter(a => a.id !== exists.id); icon.setAttribute("fill", "none"); icon.setAttribute("stroke", "currentColor"); } 
            else { saveAnnotation('bookmark', cfi, "Página selada", "", ""); icon.setAttribute("fill", "currentColor"); icon.setAttribute("stroke", "currentColor"); }
            renderNotesList();
        }
        function checkBookmarkStatus(cfi) { const b = library.find(x => x.id === activeBookId); const exists = b && b.annotations.find(a => a.type === 'bookmark' && a.cfi === cfi); const icon = document.getElementById('bookmark-icon'); if (icon) { icon.setAttribute("fill", exists ? "currentColor" : "none"); icon.setAttribute("stroke", "currentColor"); } }
