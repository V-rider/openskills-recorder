/** Injected into browser pages via Playwright addInitScript */
export const RECORDER_INIT_SCRIPT = `
(function() {
  if (window.__openskillsRecorder) return;
  window.__openskillsRecorder = { sequence: 0, dragStart: null };

  function getXPath(el) {
    if (!el || el.nodeType !== 1) return '';
    const parts = [];
    while (el && el.nodeType === 1) {
      let index = 1;
      let sibling = el.previousSibling;
      while (sibling) {
        if (sibling.nodeType === 1 && sibling.nodeName === el.nodeName) index++;
        sibling = sibling.previousSibling;
      }
      parts.unshift(el.nodeName.toLowerCase() + '[' + index + ']');
      el = el.parentNode;
    }
    return '/' + parts.join('/');
  }

  function getAccessibleName(el) {
    return el.getAttribute('aria-label')
      || el.getAttribute('title')
      || el.getAttribute('placeholder')
      || (el.labels && el.labels[0] && el.labels[0].textContent)
      || el.textContent?.trim().slice(0, 80)
      || '';
  }

  function elementInfo(el) {
    if (!el || !el.tagName) return null;
    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || undefined,
      className: el.className && typeof el.className === 'string' ? el.className : undefined,
      testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || undefined,
      ariaLabel: el.getAttribute('aria-label') || undefined,
      role: el.getAttribute('role') || undefined,
      name: getAccessibleName(el),
      placeholder: el.getAttribute('placeholder') || undefined,
      type: el.getAttribute('type') || undefined,
      text: (el.textContent || '').trim().slice(0, 120),
      xpath: getXPath(el),
      inIframe: window !== window.top,
    };
  }

  function emit(type, payload) {
    window.__openskillsRecorder.sequence += 1;
    const event = {
      id: 'evt-' + Date.now() + '-' + window.__openskillsRecorder.sequence,
      sequence: window.__openskillsRecorder.sequence,
      type,
      timestamp: new Date().toISOString(),
      url: location.href,
      payload,
    };
    window.__openskillsOnEvent?.(event);
  }

  document.addEventListener('mousedown', (e) => {
    window.__openskillsRecorder.dragStart = {
      x: e.clientX,
      y: e.clientY,
      element: elementInfo(e.target instanceof Element ? e.target : null),
    };
  }, true);

  document.addEventListener('mouseup', (e) => {
    const start = window.__openskillsRecorder.dragStart;
    if (!start) return;
    window.__openskillsRecorder.dragStart = null;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    if (dx > 5 || dy > 5) {
      emit('drag', {
        element: start.element,
        from: { x: start.x, y: start.y },
        to: { x: e.clientX, y: e.clientY },
      });
    }
  }, true);

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    emit('click', {
      element: elementInfo(target.closest('button, a, input, select, textarea, [role]') || target),
      x: e.clientX,
      y: e.clientY,
    });
  }, true);

  document.addEventListener('input', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    emit('input', {
      element: elementInfo(target),
      value: target.value,
    });
  }, true);

  document.addEventListener('change', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target instanceof HTMLSelectElement) {
      emit('change', { element: elementInfo(target), value: target.value });
    } else if (target instanceof HTMLInputElement && target.type === 'file') {
      emit('file', {
        element: elementInfo(target),
        fileNames: Array.from(target.files || []).map(f => f.name),
      });
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (['Enter', 'Tab', 'Escape'].includes(e.key)) {
      emit('keydown', { key: e.key, code: e.code });
    }
  }, true);

  let lastUrl = location.href;
  const checkNav = () => {
    if (location.href !== lastUrl) {
      emit('navigate', { from: lastUrl, to: location.href });
      lastUrl = location.href;
    }
  };
  window.addEventListener('popstate', checkNav);
  const origPush = history.pushState;
  history.pushState = function(...args) {
    origPush.apply(this, args);
    checkNav();
  };
  const origReplace = history.replaceState;
  history.replaceState = function(...args) {
    origReplace.apply(this, args);
    checkNav();
  };
})();
`;
