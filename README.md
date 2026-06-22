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
