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
            'div[data-za-detail-view-path-module="RightSideBar"], .HotSearchCard, footer[role="contentinfo"]',
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
        }
      ]
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

  function getStorageKey(siteId, ruleId) {
    return `site-rule:${siteId}:${ruleId}`;
  }

  function getSiteEnabledKey(siteId) {
    // 站点总开关和子开关分开存，便于恢复用户原本的子开关配置。
    return `site-enabled:${siteId}`;
  }

  globalScope.LowkeySiteConfig = {
    SITE_RULES,
    buildRuleSelector,
    getSiteEnabledKey,
    getStorageKey,
    matchSiteByHostname
  };
})(globalThis);
