# Chrome 与 Edge 扩展

包内扩展版本为 `0.5.1`，Chrome 和 Edge 共用同一份代码。扩展只把当前浏览器的
YouTube/Bilibili Cookie 写到本机安装目录，不会上传到网络，也不会随 GitHub 包分发。

## Chrome

1. 打开 `chrome://extensions`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择 `<安装目录>\weblab-cookie-extension`。
5. 确认名称为 `MPV WebLab · Cookie Sync`，版本为 `0.5.1`。

## Edge

1. 打开 `edge://extensions`。
2. 开启“开发人员模式”。
3. 点击“加载解压缩的扩展”。
4. 选择同一个 `<安装目录>\weblab-cookie-extension`。
5. 确认名称和版本与 Chrome 一致。

扩展 ID 应固定为：

```text
mkfocliccanidollbpnmaedkbmadjdai
```

如果扩展显示“Native Host 不可用”，先运行 `<安装目录>\maintenance\installer\Test-MPVWebLab.ps1`。
若只有扩展未更新，在扩展管理页面点击一次“重新加载”，不需要重复删除和安装。

Firefox 适配已取消；本包不会注册 Firefox Native Messaging Host。

