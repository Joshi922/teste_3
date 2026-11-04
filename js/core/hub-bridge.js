        // Splash
        window.hideSplash = function () { const s = document.getElementById('splash'); if (!s || s.classList.contains('out')) return; s.classList.add('out'); setTimeout(() => s.remove(), 1300); };
        window.returnToCtoniaHub = function () { try { if (parent && typeof parent.closeCtoniaLibrary === 'function') parent.closeCtoniaLibrary(); else if (parent) parent.postMessage({type:'ctonia-library-close'}, '*'); } catch(e) { console.warn('Não foi possível voltar ao Ctônia Hub.', e); } };

        setTimeout(hideSplash, 4600);
