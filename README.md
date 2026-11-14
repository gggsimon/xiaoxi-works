# xiaoxi-works · 小西的数字作品集

单文件 HTML 应用为主的个人作品仓库，GitHub Pages 托管：**https://gggsimon.github.io/xiaoxi-works/**

## 目录结构（品种 → 内容两级）

```
├── index.html            门面导航页（所有作品的入口）
├── html/                 品种①：网页应用
│   ├── xuanxue/          内容：大玄学
│   │   ├── xuanxue-box.html      玄学百宝箱（玄枢高级版）
│   │   ├── ziwei-6pan.html       紫微斗数 · 六层叠盘 · 活盘尊享版
│   │   ├── zhenxiang.html        真香预演器（九维命理路径推演）
│   │   ├── meet-gua.html         相遇一卦 · 活名片
│   │   └── xuantong-3d.html      玄同宇宙 · 三维洞天（Three.js，约 9MB）
│   ├── music/            内容：FM-1 音乐台
│   │   ├── index.html            FM1 · SLOOP 工作台入口
│   │   ├── fm1_arranger.html     Web MIDI 编曲器
│   │   ├── fm1_lalaland.html     LaLaLand 前奏按谱复原
│   │   └── fm1_monitor.html      USB 监听
│   └── ap10/             内容：AP10 网页原型（不烧录演示固件效果）
├── minitools/            品种②：小红书玄学小工具 37 件套
│   ├── index.html                目录页（37 张卡片分类导航）
│   └── <slug>/                   37 个工具：index.html + assets + icon
├── works/                品种③：内容作品
│   ├── shengsheng.html           《生生》长篇小说 HTML 版
│   └── holo-cards.html           全息卡牌库 v4（AI修仙传 70+ / 生生 / 龙烬亚欧）
└── firmware/             品种④：智能硬件固件
    ├── aipassport/
    │   ├── src/                  yijing-pocket ESP-IDF 完整源码（ESP32-S3）
    │   ├── bins/                 yijing-pocket-merged.bin 可刷写固件
    │   ├── delivery/             九作品小红书容器交付包（10 个 zip）
    │   ├── flash.sh              刷机脚本
    │   └── tamagochi电子宠物esp32s3.md   玩法文档
    ├── ziwei-six-layers/         紫微六层叠盘固件（play316，三件套 bin）
    ├── holocard/                 全息卡牌箱固件（LVGL 由组件管理器拉取）
    └── play-shots/               玩法示意图 5 张（play303/307/316/332/333）
```

## 说明

- 玄学区与 FM-1 的 HTML 均为**单文件自包含**（图片、音频、字体全内嵌），无外部依赖。
- minitools 37 件套为统一容器规范的纯本地 H5（单入口、零网络、零权限），目录页 `minitools/`。
- 固件 `holocard/components/lvgl`（180MB 上游库）未入库，构建时由 ESP-IDF 组件管理器重新拉取。
- 《生生》与《龙烬亚欧》为小西自著小说；卡牌库内含三套卡牌与 3 张散卡。
