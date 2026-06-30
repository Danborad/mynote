# MyNote Android

Flutter 原生安卓客户端。

## 当前版本

- 版本号：`1.0.2`
- APK：[`../releases/mynote-android-v1.0.2.apk`](../releases/mynote-android-v1.0.2.apk)
- SHA256：`fdc77b2826434e98d347cd66a3d026011621b8a64e6304c338efb209f26ef663`

## 当前状态

已完成的首轮编辑器重构：

- 独立编辑页路由：`/notes/editor/:id`
- editor 模块骨架：`EditorView / EditorViewModel / EditorToolbar / EditorStatusBar`
- HTML 导入导出过渡层：`EditorHtmlMapper`
- 基础格式工具栏过渡实现：
  - 加粗
  - 斜体
  - 下划线
  - 无序列表
  - 任务列表
  - 代码块
- 自动保存首版
- 图片插入首版（通过可注入 URL provider，不直接接平台选图）

## 当前编辑器能力边界

当前编辑器仍是**过渡版富文本实现**，主要用于先打通 Android 端的模块边界、路由、保存链路和基础格式化流程。

### 已支持

- 加载后端 HTML 内容
- 保存回后端 HTML
- 工具栏触发最小可用 HTML 变更
- 自动保存去抖
- 图片 HTML 片段插入

### 尚未完成

- 真实 AppFlowy Editor widget 接入
- 真正的选区级富文本编辑
- 平台图片选择/上传
- 附件、音视频、自定义块
- 彻底删除旧 `_EditorPanel` 代码

## 关键文件

- `lib/ui/views/editor/editor_view.dart`
- `lib/ui/viewmodels/editor_view_model.dart`
- `lib/ui/widgets/editor_toolbar.dart`
- `lib/ui/widgets/editor_status_bar.dart`
- `lib/data/mappers/editor_html_mapper.dart`
- `lib/data/services/editor_autosave_service.dart`

## 已知环境问题

当前执行环境中的 Flutter SDK 状态异常，命令输出会出现：

- `Flutter SDK version is 0.0.0-unknown`
- `/usr/local/flutter` ownership / git safety 问题

因此在这个环境里，`flutter test` 可能无法正常跑通；当前更可靠的检查方式是先使用 `dart analyze` 做静态验证。
