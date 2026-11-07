(() => {
  const reviewTerms = /待核实|待复核|待审核|待核对|待确认|待补核|授权待核|needs_review|截图/i;
  const selectors = '.artifact-card-status, .kg-review, [data-kind="needs_review"], #detail-status';

  function clean(value) {
    return String(value)
      .replace(/2009年图录页面截图|图录扫描页截图|图录页截图/g, '图录页面影像')
      .replace(/图版截图/g, '图版影像')
      .replace(/截图/g, '页面影像')
      .replace(/[（(][^）)]*(?:待核实|待复核|待审核|待核对|待确认|待补核|授权待核|needs_review)[^）)]*[）)]/gi, '')
      .replace(/记录状态\s*[:：]\s*(?:资料)?待复核/gi, '')
      .replace(/(?:内容均为|所有记录均为)待复核[。；;]?/g, '')
      .replace(/(?:图录档案|资料|档案|作者|署名|权利状态|权利|许可|图片来源|图像来源|来源链接|年代|材质|出土信息|日期|尺寸)?待核实|(?:图录档案|资料|档案)?待复核|待审核|待核对|待确认|待补核|授权待核|needs_review/gi, '')
      .replace(/\s*[·；,]\s*(?=[。；,]|$)/g, '')
      .replace(/(?:　|\s)*[/／|·,，；;](?:　|\s)*(?=[/／|·,，；;]|$)/g, '')
      .replace(/[（(]\s*[，,；;]?\s*[）)]/g, '')
      .replace(/^[\s·；，,。:：]+|[\s·；，,。:：]+$/g, '')
      .replace(/\s{2,}/g, ' ');
  }

  function pruneEmptyValue(node, parent) {
    const description = parent.closest?.('dd');
    if (description && !clean(description.textContent).trim()) {
      const row = description.closest('dl > div');
      if (row) row.remove();
      else {
        description.previousElementSibling?.tagName === 'DT' && description.previousElementSibling.remove();
        description.remove();
      }
      return;
    }
    if (clean(parent.textContent).trim()) return;
    if (/^(P|SMALL|SPAN|I)$/i.test(parent.tagName)) parent.remove();
  }

  function suppress(root) {
    if (root.nodeType === Node.ELEMENT_NODE) {
      if (root.matches?.(selectors)) {
        root.hidden = true;
        root.style.setProperty('display', 'none', 'important');
      }
      root.querySelectorAll?.(selectors).forEach(element => {
        element.hidden = true;
        element.style.setProperty('display', 'none', 'important');
      });
      const labelled = [root, ...(root.querySelectorAll?.('[aria-label], [title], [alt]') || [])];
      for (const element of labelled) {
        for (const attr of ['aria-label', 'title', 'alt']) {
          const value = element.getAttribute?.(attr);
          if (value && reviewTerms.test(value)) element.setAttribute(attr, clean(value));
        }
      }
    }

    const nodes = root.nodeType === Node.TEXT_NODE ? [root] : [];
    if (root.nodeType !== Node.TEXT_NODE) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) nodes.push(walker.currentNode);
    }
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/i.test(parent.tagName)) continue;
      if (/2009年图录页面截图|图录扫描页截图|图录页截图|图版截图|截图/.test(node.nodeValue) || reviewTerms.test(node.nodeValue)) {
        node.nodeValue = clean(node.nodeValue);
        pruneEmptyValue(node, parent);
      }
    }
  }

  suppress(document.body);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') suppress(record.target.parentElement || document.body);
      if (record.type === 'attributes') suppress(record.target);
      for (const node of record.addedNodes || []) {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) suppress(node);
      }
    }
  }).observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-label', 'title', 'alt'],
    subtree: true
  });
})();
