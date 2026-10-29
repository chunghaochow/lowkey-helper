(function attachSiteRules(globalScope) {
  // 每个站点都用 hostname + rules 来描述，popup 和 content script 共用这份配置。
  const SITE_RULES = [
    {
      id: "youtube",
      label: "YouTube",
      hosts: ["www.youtube.com", "youtube.com", "m.youtube.com"],
      rules: [
        {
          id: "masthead",
          label: "隐藏顶部导航栏",
          className: "ytd-masthead",
          defaultEnabled: true
        },
        {
          id: "guide",
          label: "隐藏左侧边栏",
          className: "tp-yt-app-drawer",
          defaultEnabled: true
        }
      ]
    },
    {
      id: "github",
      label: "GitHub",
      hosts: ["github.com"],
      rules: [
        {
          id: "header",
          label: "隐藏顶部导航栏",
          className: "AppHeader",
          defaultEnabled: true
        },
        {
          id: "global-sidebar",
          label: "隐藏侧边栏",
          className: "Layout-sidebar",
          defaultEnabled: false
        }
      ]
    },
    {
      id: "zhihu",
      label: "知乎",
      hosts: ["www.zhihu.com", "zhihu.com"],
      rules: [
        {
          id: "header",
          label: "隐藏顶部导航栏",
          className: "AppHeader",
          defaultEnabled: true
        },
        {
          id: "sidebar",
          label: "隐藏右侧边栏",
          selector:
            'div[data-za-detail-view-path-module="RightSideBar"], .HotSearchCard, .Post-Row-Content-right, footer[role="contentinfo"]',
          defaultEnabled: true
        }
      ]
    },
    {
      id: "juejin",
      label: "掘金",
      hosts: ["www.juejin.cn", "juejin.cn"],
      rules: [
        {
          id: "header",
          label: "隐藏顶部导航栏",
          selector: "header",
          defaultEnabled: true
        },
        {
          id: "sidebar",
          label: "隐藏右侧边栏",
          selector: "#sidebar-container",
          defaultEnabled: true
        },
        {
          id: "left-sidebar",
          label: "隐藏左侧边栏",
          className: "article-suspended-panel",
          defaultEnabled: true
        }
      ]
    },
    {
      id: "xueqiu",
      label: "雪球",
      hosts: ["xueqiu.com", "www.xueqiu.com"],
      rules: [
        {
          id: "header",
          label: "隐藏顶部导航栏",
          className: "nav stickyFixed",
          defaultEnabled: true
        },
        {
          id: "right-sidebar",
          label: "隐藏右侧边栏",
          className: "home__col--rt",
          defaultEnabled: true
        },
        {
          id: "user-left-sidebar",
          label: "隐藏左侧用户侧边栏",
          className: "user__col--lf",
          defaultEnabled: true
        },
        {
          id: "stock-sidebar",
          label: "隐藏个股侧栏",
          selector: ".stock-links, .stock__side",
          defaultEnabled: true
        },
        {
          id: "stock-index",
          label: "隐藏大盘区",
          className: "home__stock-index",
          defaultEnabled: true
        },
        {
          id: "optional",
          label: "隐藏自选区",
          selector: "#optional",
          defaultEnabled: true
        },
        {
          id: "stock-kline",
          label: "隐藏个股K线",
          selector: ".quote-container, .chart-container-box",
          defaultEnabled: true
        }
      ]
    },
    {
      id: "x",
      label: "X",
      hosts: ["x.com", "www.x.com"],
      rules: [
        {
          id: "left-nav",
          label: "隐藏左侧导航栏",
          selector: 'header[role="banner"]',
          hideMode: "opacity",
          // showInPopup: false,
          defaultEnabled: true
        },
        {
          id: "right-sidebar",
          label: "隐藏右侧边栏",
          selector: 'div[data-testid="sidebarColumn"]',
          hideMode: "opacity",
          // showInPopup: false,
          defaultEnabled: true
        }
      ]
    }
  ];

  // 全局规则对所有网站生效（包括未匹配任何预设站点的页面），且不受站点总开关影响。
  // 全局规则默认使用 chrome.storage.local 持久化，避免同步存储的配额与跨设备覆盖问题。
  const GLOBAL_RULES = [
    {
      id: "no-image-mode",
      label: "无图模式",
      selector: "img",
      storageArea: "local",
      defaultEnabled: false
    }
  ];

  function normalizeClassSelector(className) {
    // 支持把 "nav stickyFixed" 这类 className 转成 ".nav.stickyFixed" 选择器。
    return String(className || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => `.${name}`)
      .join("");
  }

  function matchSiteByHostname(hostname) {
    if (!hostname) {
      return null;
    }

    return (
      SITE_RULES.find((site) =>
        site.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
      ) || null
    );
  }

  function buildRuleSelector(rule) {
    // 优先使用显式 selector，方便配置复杂或更稳定的属性选择器。
    if (rule.selector) {
      return rule.selector;
    }

    return normalizeClassSelector(rule.className);
  }

  function buildRuleStyle(rule) {
    const selector = buildRuleSelector(rule);
    if (!selector) {
      return "";
    }

    if (rule.hideMode === "opacity") {
      return `${selector} { opacity: 0 !important; cursor: none !important; pointer-events: none !important; }`;
    }

    return `${selector} { display: none !important; }`;
  }

  function getRulesForSite(site) {
    // 站点规则在前，全局规则在后，保证 popup 中的展示顺序稳定。
    return site ? [...site.rules, ...GLOBAL_RULES] : [...GLOBAL_RULES];
  }

  function getStorageKey(scopeId, ruleId) {
    return `site-rule:${scopeId}:${ruleId}`;
  }

  function getGlobalStorageKey(ruleId) {
    // 全局规则用独立命名空间，和站点规则的状态互不影响。
    return `global-rule:${ruleId}`;
  }

  function getRuleStorageKey(siteId, rule) {
    if (isGlobalRule(rule)) {
      return getGlobalStorageKey(rule.id);
    }

    return getStorageKey(siteId, rule.id);
  }

  function getRuleStorageArea(rule) {
    // 默认沿用 sync，全局规则显式声明 local，单独持久化。
    return rule.storageArea === "local" ? "local" : "sync";
  }

  function isGlobalRule(rule) {
    return GLOBAL_RULES.some((item) => item.id === rule.id);
  }

  function getSiteEnabledKey(siteId) {
    // 站点总开关和子开关分开存，便于恢复用户原本的子开关配置。
    return `site-enabled:${siteId}`;
  }

  globalScope.LowkeySiteConfig = {
    GLOBAL_RULES,
    SITE_RULES,
    buildRuleStyle,
    buildRuleSelector,
    getGlobalStorageKey,
    getRuleStorageArea,
    getRuleStorageKey,
    getRulesForSite,
    getSiteEnabledKey,
    getStorageKey,
    isGlobalRule,
    matchSiteByHostname
  };
})(globalThis);
