        // Marcadores
        function clearMarkers() { const l = document.getElementById('marker-layer'); if (l) l.innerHTML = ''; }
        let _mkRaf = 0;
        views.viewer.addEventListener('scroll', () => { if (_mkRaf) return; _mkRaf = requestAnimationFrame(() => { _mkRaf = 0; refreshMarkers(); }); }, true);
        window.addEventListener('resize', () => { clearMarkers(); setTimeout(refreshMarkers, 400); });

        // Arquivos
