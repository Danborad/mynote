# MyNote Android APK 打包说明

## 已完成的改造

- 已接入 Capacitor Android 工程：`web/android`
- 已新增常用命令（见 `web/package.json`）
- 已支持通过 `VITE_API_BASE` 配置 Android 端 API 地址

## 先决条件

请确保本机已安装：

- JDK 21（并设置 `JAVA_HOME`）
- Android Studio（包含 Android SDK）

当前环境已完成 JDK/Android SDK 配置，并可成功打出 debug APK。

## API 地址配置（关键）

因为 APK 内是本地 WebView，不再走 Vite 开发代理，必须给出完整 API 地址。

示例（真机同局域网）：

```bash
VITE_API_BASE=http://192.168.1.50:3000/api bun run apk:debug
```

示例（Android 模拟器访问宿主机）：

```bash
VITE_API_BASE=http://10.0.2.2:3000/api bun run apk:debug
```

## 打包命令

- Debug APK：`bun run apk:debug`
- Release APK：`bun run apk:release`

## 产物路径

- Debug APK：`web/android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK：`web/android/app/build/outputs/apk/release/app-release-unsigned.apk`

## 可选操作

- 打开 Android Studio：`bun run android:open`
- 只同步 Web 资源到 Android：`bun run android:sync`
