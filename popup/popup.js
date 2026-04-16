(function runPopup(globalScope) {
  const config = globalScope.LowkeySiteConfig;

  if (!config || !globalScope.chrome?.tabs) {
    return;
  }

  const siteNameElement = document.getElementById("site-name");
  const siteHostElement = document.getElementById("site-host");
  const supportedView = document.getElementById("supported-view");
  const unsupportedView = document.getElementById("unsupported-view");
  const siteToggleElement = document.getElementById("site-toggle");
  const ruleListElement = document.getElementById("rule-list");

  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    return tab || null;
  }

  async function getStoredState(siteId, rule) {
    const storageKey = config.getStorageKey(siteId, rule.id);
    const result = await chrome.storage.sync.get(storageKey);

    if (typeof result[storageKey] === "boolean") {
      return result[storageKey];
    }

    return rule.defaultEnabled !== false;
  }

  async function getSiteEnabled(siteId) {
    const storageKey = config.getSiteEnabledKey(siteId);
    const result = await chrome.storage.sync.get(storageKey);

    if (typeof result[storageKey] === "boolean") {
      return result[storageKey];
    }

    return true;
  }

  function createSwitch({ checked, ariaLabel, onChange }) {
    // popup 里的所有开关都复用同一套 DOM 结构和交互逻辑。
    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.setAttribute("aria-label", ariaLabel);
    input.addEventListener("change", onChange);

    const slider = document.createElement("span");
    slider.className = "slider";

    switchLabel.append(input, slider);
    return { input, switchLabel };
  }

  function createRuleRow({ titleText, metaText, checked, ariaLabel, onChange, className = "" }) {
    const row = document.createElement("div");
    row.className = `rule-item ${className}`.trim();

    const textWrap = document.createElement("div");
    const title = document.createElement("p");
    title.className = "rule-item__label";
    title.textContent = titleText;

    const meta = document.createElement("p");
    meta.className = "rule-item__meta";
    meta.textContent = metaText;

    textWrap.append(title, meta);

    const { input, switchLabel } = createSwitch({
      checked,
      ariaLabel,
      onChange
    });

    row.append(textWrap, switchLabel);

    return { input, row };
  }

  async function renderSupportedSite(site) {
    siteNameElement.textContent = site.label;
    supportedView.hidden = false;
    unsupportedView.hidden = true;
    siteToggleElement.innerHTML = "";
    ruleListElement.innerHTML = "";
    const visibleRules = site.rules.filter((rule) => rule.showInPopup !== false);
    if (visibleRules.length === 0) {
      return;
    }

    const [siteEnabled, states] = await Promise.all([
      getSiteEnabled(site.id),
      Promise.all(visibleRules.map((rule) => getStoredState(site.id, rule)))
    ]);

    // 总开关不覆盖子开关存储值，只控制当前网站规则是否整体生效。
    const { row: masterRow } = createRuleRow({
      titleText: "总开关",
      metaText: "关闭后本网站的隐藏规则暂停生效，重新打开时恢复子开关各自配置",
      checked: siteEnabled,
      ariaLabel: `${site.label} 总开关`,
      onChange: async (event) => {
        const storageKey = config.getSiteEnabledKey(site.id);
        await chrome.storage.sync.set({
          [storageKey]: event.target.checked
        });
      },
      className: "rule-item--master"
    });

    siteToggleElement.appendChild(masterRow);

    visibleRules.forEach((rule, index) => {
      const { row } = createRuleRow({
        titleText: rule.label,
        metaText: rule.className ? `className: ${rule.className}` : rule.selector,
        checked: states[index],
        ariaLabel: rule.label,
        onChange: async (event) => {
          const storageKey = config.getStorageKey(site.id, rule.id);
          await chrome.storage.sync.set({
            [storageKey]: event.target.checked
          });
        }
      });

      ruleListElement.appendChild(row);
    });
  }

  function renderUnsupportedSite(hostname) {
    siteNameElement.textContent = "未匹配预设网站";
    siteHostElement.textContent = hostname || "无法识别当前页面";
    supportedView.hidden = true;
    unsupportedView.hidden = false;
  }

  async function init() {
    const tab = await getCurrentTab();
    let url = null;
    if (tab?.url) {
      try {
        url = new URL(tab.url);
      } catch (error) {
        url = null;
      }
    }
    const hostname = url?.hostname || "";

    siteHostElement.textContent = hostname || "无法识别当前页面";

    // popup 只展示当前标签页命中的那一个站点配置。
    const site = config.matchSiteByHostname(hostname);
    if (!site) {
      renderUnsupportedSite(hostname);
      return;
    }

    await renderSupportedSite(site);
  }

  init();
})(globalThis);
