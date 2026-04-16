(function runContentScript(globalScope) {
  const config = globalScope.LowkeySiteConfig;

  if (!config || !globalScope.chrome?.storage?.sync) {
    return;
  }

  const appliedStyles = new Map();
  const site = config.matchSiteByHostname(globalScope.location.hostname);

  if (!site) {
    return;
  }

  async function getSiteEnabled() {
    const storageKey = config.getSiteEnabledKey(site.id);
    const storedValue = await chrome.storage.sync.get(storageKey);

    if (typeof storedValue[storageKey] === "boolean") {
      return storedValue[storageKey];
    }

    return true;
  }

  async function getRuleEnabled(rule) {
    // 不展示在 UI 的规则只受配置文件控制，避免历史 storage 值影响它。
    if (rule.showInPopup === false) {
      return rule.defaultEnabled !== false;
    }

    const storageKey = config.getStorageKey(site.id, rule.id);
    const storedValue = await chrome.storage.sync.get(storageKey);

    if (typeof storedValue[storageKey] === "boolean") {
      return storedValue[storageKey];
    }

    return rule.defaultEnabled !== false;
  }

  function ensureRuleStyle(rule) {
    const ruleStyle = config.buildRuleStyle(rule);
    if (!ruleStyle) {
      return null;
    }

    let styleElement = appliedStyles.get(rule.id);
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.dataset.lowkeyRuleId = rule.id;
      // 通过注入 style 来隐藏元素，避免直接改动页面节点结构。
      styleElement.textContent = ruleStyle;
      appliedStyles.set(rule.id, styleElement);
    }

    if (!styleElement.isConnected) {
      document.documentElement.appendChild(styleElement);
    }

    return styleElement;
  }

  function disableRuleStyle(ruleId) {
    const styleElement = appliedStyles.get(ruleId);
    if (styleElement?.isConnected) {
      styleElement.remove();
    }
  }

  async function applyRule(rule) {
    // 子开关决定“这一项是否允许生效”，总站点开关决定“当前网站是否整体暂停”。
    if (rule.showInPopup === false) {
      const enabled = await getRuleEnabled(rule);
      if (enabled) {
        ensureRuleStyle(rule);
      } else {
        disableRuleStyle(rule.id);
      }
      return;
    }

    const [siteEnabled, ruleEnabled] = await Promise.all([getSiteEnabled(), getRuleEnabled(rule)]);
    const enabled = siteEnabled && ruleEnabled;

    if (enabled) {
      ensureRuleStyle(rule);
      return;
    }

    disableRuleStyle(rule.id);
  }

  async function applyAllRules() {
    await Promise.all(site.rules.map(applyRule));
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    const siteEnabledKey = config.getSiteEnabledKey(site.id);
    if (siteEnabledKey in changes) {
      // 总开关变化时，整站规则都需要重新计算。
      applyAllRules();
      return;
    }

    site.rules.forEach((rule) => {
      const storageKey = config.getStorageKey(site.id, rule.id);
      if (!(storageKey in changes)) {
        return;
      }
      applyRule(rule);
    });
  });

  applyAllRules();
})(globalThis);
