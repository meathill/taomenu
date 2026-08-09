# TaoMenu 品牌标识

## 核心标识

TaoMenu 的 icon 是一张菜单卡：三个清晰的 QR 定位角构成第一识别层，中央的 phở 碗与蒸汽表达越南餐饮场景，右下角折角表达菜单卡和扫码入口。

它不是可扫描的 QR code，也不承载门店或订单数据。实际门店二维码仍由产品按门店 token 单独生成。

## 官方颜色

| 颜色 | 色值 | 用途 |
| --- | --- | --- |
| 漆红 | `#B3262D` | 菜单卡外框、QR 定位角和主要品牌识别 |
| 米纸白 | `#FFF9F2` | icon 背景、菜单卡内页和反白区域 |
| 翡翠绿 | `#2E6F5E` | phở 碗、蒸汽和折角；也是后台主操作色 |
| 墨色 | `#211A18` | 单色印刷和深色文字 |

## 使用规则

- icon 内不放 `TaoMenu` 字样；需要文字时使用英文 `TaoMenu` 字标与 icon 横向组合。
- icon 周围保留至少一个 icon 内边距的安全区；PWA maskable 版本不得让外框进入安全区外。
- 48px 以上使用全色版本；32px 以下优先使用简化单色版本，必要时减少 QR data modules，但保留三个定位角和中央 phở 轮廓。
- 不把品牌 icon 当作真实二维码使用，不在 icon 上叠加门店 token、价格或支付状态。
- 不使用渐变、阴影、纸币纹理、国旗五角星、筷子、斗笠或灯笼作为替代元素。

## 资产位置

- App：`apps/app/public/brand/taomenu-mark.svg`
- App 单色：`apps/app/public/brand/taomenu-mark-mono.svg`
- App 反白：`apps/app/public/brand/taomenu-mark-inverse.svg`
- Website：`apps/website/public/brand/taomenu-mark.svg`
- PWA 与系统图标：`apps/app/public/icons/`，包括 16/32px favicon、180px Apple Touch Icon、192/512px PWA 和 512px maskable。
