        async function apply3DFlip(direction, renderFunc) {
            if (isPdfBook) { await renderFunc(); return; }
            if (!readerSettings.anim3d || readerSettings.scroll) {
                await renderFunc();
                return;
            }

            const viewer = document.getElementById('viewer');
            const stage = document.getElementById('pdf-stage');
            if (!viewer) {
                await renderFunc();
                return;
            }

            // PDF: animate a visual clone of the outgoing page, leaving the live
            // page (text, links and highlight layers) untouched underneath.
            // EPUB has no #pdf-stage; keep its original reader/rendition intact
            // and use a lightweight CSS transition on the viewer itself.
            if (!stage) {
                const oldTransition = viewer.style.transition;
                const oldTransform = viewer.style.transform;
                const oldOrigin = viewer.style.transformOrigin;
                const oldOpacity = viewer.style.opacity;
                const outOrigin = direction === 1 ? 'left center' : 'right center';
                const outRotate = direction === 1 ? '-7deg' : '7deg';
                try {
                    viewer.style.transformOrigin = outOrigin;
                    viewer.style.transition = 'transform 140ms ease, opacity 140ms ease';
                    viewer.style.transform = `perspective(1800px) rotateY(${outRotate})`;
                    viewer.style.opacity = '0.72';
                    await new Promise(resolve => setTimeout(resolve, 140));
                    await renderFunc();
                    viewer.style.transition = 'none';
                    viewer.style.transform = `perspective(1800px) rotateY(${-parseFloat(outRotate)}deg)`;
                    viewer.style.opacity = '0.82';
                    void viewer.offsetWidth;
                    viewer.style.transition = 'transform 220ms ease, opacity 220ms ease';
                    viewer.style.transform = 'perspective(1800px) rotateY(0deg)';
                    viewer.style.opacity = '1';
                    await new Promise(resolve => setTimeout(resolve, 220));
                } finally {
                    viewer.style.transition = oldTransition;
                    viewer.style.transform = oldTransform;
                    viewer.style.transformOrigin = oldOrigin;
                    viewer.style.opacity = oldOpacity;
                }
                return;
            }

            if (viewer.dataset.ctFlipBusy === '1') {
                await renderFunc();
                return;
            }
            viewer.dataset.ctFlipBusy = '1';

            const previousPerspective = viewer.style.perspective;
            const previousStageOpacity = stage.style.opacity;
            let clone = null;
            try {
                clone = stage.cloneNode(true);
                clone.id = 'pdf-stage-flip-clone';
                // Avoid duplicate IDs while the temporary visual layer exists.
                clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

                // cloneNode does not copy canvas pixels; copy each page canvas.
                const sourceCanvases = stage.querySelectorAll('canvas');
                const cloneCanvases = clone.querySelectorAll('canvas');
                sourceCanvases.forEach((canvas, index) => {
                    const target = cloneCanvases[index];
                    if (!target) return;
                    target.width = canvas.width;
                    target.height = canvas.height;
                    try {
                        const ctx = target.getContext('2d');
                        if (ctx) ctx.drawImage(canvas, 0, 0);
                    } catch (e) {}
                });

                const rect = stage.getBoundingClientRect();
                const viewerRect = viewer.getBoundingClientRect();
                clone.style.position = 'absolute';
                clone.style.top = `${rect.top - viewerRect.top + viewer.scrollTop}px`;
                clone.style.left = `${rect.left - viewerRect.left + viewer.scrollLeft}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.height = `${rect.height}px`;
                clone.style.margin = '0';
                clone.style.zIndex = '1000';
                clone.style.pointerEvents = 'none';
                clone.style.overflow = 'hidden';
                clone.style.transformStyle = 'preserve-3d';
                clone.style.backfaceVisibility = 'hidden';
                clone.style.transformOrigin = direction === 1 ? 'left center' : 'right center';
                clone.style.transform = 'rotateY(0deg)';
                clone.style.opacity = '1';
                clone.style.filter = 'none';
                clone.style.transition = 'transform 620ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 620ms ease, filter 620ms ease';

                viewer.style.perspective = '1800px';
                viewer.style.position = viewer.style.position || 'relative';
                viewer.appendChild(clone);

                // Render the destination page beneath the clone. The original
                // PDF DOM remains the active one, so selection and annotations
                // continue to belong to the real page, not to a screenshot.
                stage.style.opacity = '0';
                await renderFunc();
                stage.style.opacity = previousStageOpacity || '1';

                // Give the browser a paint boundary before starting the turn.
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const angle = direction === 1 ? -112 : 112;
                const shadowX = direction === 1 ? '16px' : '-16px';
                clone.style.transform = `rotateY(${angle}deg) scale(0.985)`;
                clone.style.opacity = '0.03';
                clone.style.filter = `brightness(0.68) drop-shadow(${shadowX} 0 18px rgba(0,0,0,0.42))`;
                await new Promise(resolve => setTimeout(resolve, 640));
            } catch (error) {
                console.error('Falha no efeito de folhear em 3D:', error);
                // If the animation fails, still complete navigation normally.
                if (stage && stage.style.opacity === '0') {
                    stage.style.opacity = previousStageOpacity || '1';
                    try { await renderFunc(); } catch (e) {}
                }
            } finally {
                if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
                stage.style.opacity = previousStageOpacity;
                viewer.style.perspective = previousPerspective;
                delete viewer.dataset.ctFlipBusy;
            }
        }
