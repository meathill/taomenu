# 验收清单（封闭试点前 · 当前可测范围）

本清单对应 **Free 手工主路径**：开店 → 菜单 → 桌码/取餐码 → 顾客下单 → Staff 配对 → 终端处理 → Push。

**不在本次验收**：Pro/AI、多终端 DO 实时、打印机。

## 0. 准备

```bash
pnpm install
cp apps/app/.dev.vars.example apps/app/.dev.vars   # 确认有 VAPID_*
pnpm --filter @taomenu/app db:migrate:local
pnpm dev:app    # http://localhost:3001
# 可选
pnpm dev:website  # http://localhost:3000
```

- [ ] `pnpm format && pnpm typecheck && pnpm test && pnpm build` 全绿

## 1. 店主：注册与开店（手机宽 360px 优先）

- [ ] `/login` 用邮箱 OTP（看 terminal `[taomenu-otp]`）登录
- [ ] 无门店时进入 `/app/onboarding`，填店名 + 选经营模式（堂食 / 取餐 / 混合）
- [ ] 草稿刷新页面不丢；完成后进入 `/app`

## 2. 菜单（手工 Free）

- [ ] `/app/menu` 添加至少 1 个分类、2 道菜（整数 VND）
- [ ] 切换「Báo hết」生效
- [ ] **Xuất bản menu** 成功；空菜单/无可用菜不能发布

## 3. 桌码 / 取餐码

- [ ] `/app/tables` 创建「Bàn 1」，屏幕出现 **QR + 链接**（仅创建/换码时显示 token）
- [ ] 分享/复制链接可用
- [ ] 创建取餐点「Quầy」，同样有 QR（无座店路径）
- [ ] 「Đổi mã」后旧 token 失效（可选：旧链打开 404）

## 4. 顾客堂食

- [ ] 打开桌码链接：见店名、桌号、菜单
- [ ] 加购 → 发送 order → 得到 **#displayNumber**
- [ ] 状态页「Làm mới」可更新；切到其他 App 再切回可刷新（无后台轮询）
- [ ] **Gọi nhân viên** / **Gọi tính tiền** 可点（计钱需已有开桌 session；先下单再计钱）

## 5. 顾客外带

- [ ] 打开取餐码链接 → 下单 → 得到 **短取餐号**
- [ ] 切后台再切回可刷新状态

## 6. 终端 + Push（关键）

- [ ] 店主在 `/app/staff` 生成一次性配对二维码
- [ ] Staff 设备扫描二维码，未登录时先完成邮箱 OTP 登录
- [ ] 登录后页面显示配对码；与店主页面核对一致，再填写设备名并点击「配对设备」
- [ ] 配对成功后进入 `/terminal`，刷新页面仍要求 Staff 账号登录并可见新单
- [ ] Free 默认 1 个 Staff 席位（店主不占 Staff 席位）；第 2 个 Staff 配对应被拒绝
- [ ] `/app/staff` 可查看已配对设备并撤销设备
- [ ] **安装 PWA**（iOS 必须加主屏幕）→ **Bật thông báo** → **Gửi thử** → **点击通知** 显示已验证
- [ ] 顾客再下一单 → **约 2 秒内**锁屏/后台收到「Có đơn hàng mới」（无菜名金额）
- [ ] 接单后状态推进：堂食 接受→已上菜；外带 接受→可取→已取
- [ ] 服务请求出现在终端金色卡片，可「Đã thấy / Xong」
- [ ] 「Ghi nhận đã thu tiền mặt」可记付款；session 余额清零后可关台

## 7. 暂停接单

- [ ] `/app` 点「Tạm dừng」后顾客不能新下单
- [ ] 「Mở lại」后恢复

## 8. Staff 席位订阅

- [ ] 配置 Stripe Price ID、Restricted API Key 和 Webhook secret 后，店主可购买额外 Staff 席位
- [ ] Checkout 完成且 Webhook 同步后，席位上限增加；新增席位可用于配对
- [ ] 取消 Staff 席位订阅后，Webhook 将额外席位归零

## 9. 边界（快速）

- [ ] 重复 idempotency 不造第二单（同一 key 再 POST 返回 reused）
- [ ] 未登录访问 `/app`、`/terminal` 跳登录
- [ ] 顾客 `/m/*` 不弹通知权限

## 验收结论

| 结论 | 条件 |
|---|---|
| **通过** | 1–7 主路径均可完成；Push 在至少一台真机后台可用 |
| **有条件通过** | 主路径 OK，仅 Push 因本机浏览器限制失败，但终端前台 5s 轮询仍可见单 |
| **不通过** | 无法完成开店/发布/下单/接单任一环 |

签收时记下：设备型号、浏览器、是否 PWA 安装、Push 是否成功。
