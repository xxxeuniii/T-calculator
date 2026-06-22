# 做T计算器

一个同时包含静态网页版本和 React Native/Expo 版本的做T收益计算器。

## React Native 版本

Windows 直接运行浏览器版：

```bat
run-web.bat
```

安装依赖：

```bash
npm install
```

启动：

```bash
npm start
```

然后用 Expo Go 扫码，或运行：

```bash
npm run android
npm run ios
```

## 计算规则

- 佣金：万三，买卖双向收取，单笔最低 5 元
- 印花税：卖出金额的 0.05%
- 正T：先卖出，后接回
- 反T：先买入，后卖出

## 自动部署

推送到 `main` 后，GitHub Actions 会构建 Web 版本并同步到服务器：

```text
/opt/apps/t-calculator/current
```

需要在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 添加：

```text
SERVER_HOST=106.53.77.119
SERVER_USER=ubuntu
SERVER_SSH_KEY=服务器 SSH 私钥内容
```

部署后访问：

```text
http://106.53.77.119/t-calculator/
```
