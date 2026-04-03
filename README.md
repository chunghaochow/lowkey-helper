# Lowkey Helper

一个基于 Chrome Manifest V3 的轻量插件，用来按网站配置隐藏页面元素。

## 当前能力

- 在 `src/config/sites.js` 中预设常用网站规则
- 按网站 hostname 匹配配置
- 使用 `className` 生成选择器并隐藏目标元素
- 在插件弹窗中只显示当前网站对应的隐藏项开关
- 开关状态存储在 `chrome.storage.sync`

## 项目结构

```text
.
├── manifest.json
├── popup
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
└── src
    ├── config
    │   └── sites.js
    └── content
        └── content.js
```

## 修改网站配置

在 `src/config/sites.js` 中新增一项：

```js
{
  id: "example",
  label: "Example",
  hosts: ["www.example.com", "example.com"],
  rules: [
    {
      id: "header",
      label: "隐藏顶部导航栏",
      className: "site-header",
      defaultEnabled: true
    }
  ]
}
```

如果某个元素的 class 很复杂，也可以直接额外加 `selector` 字段。

## 本地加载

1. 打开 Chrome 的扩展程序页面：`chrome://extensions/`
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选择当前目录 `/Users/xxx/workspace/lowkey_helper`
