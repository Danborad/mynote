# Screenshots 目录说明

这个目录用于存放浏览器测试过程中产生的页面截图、日志和页面快照。

为避免后续开发过程中截图文件越来越混乱，统一按下面结构维护。

## 目录结构

- `screenshots/presentation/`
  - 存放标准展示图
  - 统一使用 `1920x1080` 视口
  - 统一使用 `16:9` 比例
  - 适合给人看、做汇报、做对比

- `screenshots/evidence/`
  - 存放排查问题时的原始证据截图
  - 可以是全页截图，不要求固定比例
  - 用于定位 bug、保留修复前后证据

- `screenshots/logs/`
  - 存放 Playwright 控制台日志、网络日志等文本证据

- `screenshots/snapshots/`
  - 存放 Playwright 页面结构快照 (`.md`)
  - 用于回溯当时页面状态和节点结构

## 命名规则

建议统一使用：

`序号-页面名-主题-用途.扩展名`

示例：

- `01-home-light-16x9.png`
- `02-home-dark-16x9.png`
- `09-share-links-dark-full.png`
- `playwright-console-after-login.log`

## 当前约定

- `presentation/` 下只放最终保留的标准图
- `evidence/` 下放过程截图和问题证据图
- `logs/` 下放自动化测试日志
- `snapshots/` 下放页面结构快照

## 清理原则

- 页面问题确认修复后，优先保留 `presentation/` 中的最终图
- 同一问题的中间过程图，如果已经没有保留价值，可以只保留 1 张代表图
- `logs/` 和 `snapshots/` 可保留最近一次有效测试结果，旧文件定期清理
- 不要把临时截图直接堆在 `screenshots/` 根目录

## 后续执行规则

后续凡是我继续做浏览器测试时：

- 展示图默认存到 `screenshots/presentation/`
- 排查证据默认存到 `screenshots/evidence/`
- 控制台/网络日志默认存到 `screenshots/logs/`
- 页面结构快照默认存到 `screenshots/snapshots/`

这样后续开发继续推进时，截图目录不会越积越乱。
