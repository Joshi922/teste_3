        // Progresso / retomar leitura
        function recordProgress(pct, extra) {
            if (progressLocked) return; const b = library.find(x => x.id === activeBookId); if (!b) return;
            b.progress = Math.max(0, Math.min(100, pct)); b.lastRead = Date.now(); Object.assign(b, extra || {});
            if (b.progress >= 97 && !b.finishedAt) b.finishedAt = Date.now(); libDirty = true;
        }
        const dayKey = t => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
        setInterval(() => {
            if (document.hidden || views.reader.classList.contains('hidden') || !activeBookId) return;
            const b = library.find(x => x.id === activeBookId); if (!b) return;
            b.readSeconds = (b.readSeconds || 0) + 5; const k = dayKey(Date.now()); appMeta.readLog[k] = (appMeta.readLog[k] || 0) + 5; libDirty = true;
        }, 5000);
