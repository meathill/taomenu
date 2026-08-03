import { DEFAULT_LOCALE, isLocale, type Locale } from './locale';

/** push 通知正文文案（按店铺 baseLocale 选取） */
export type PushCopy = {
  newOrder: string;
  testNotification: string;
  needAssistance: string;
  requestBill: string;
  callStaff: string;
  genericUpdate: string;
};

const PUSH_COPY: Record<Locale, PushCopy> = {
  en: {
    newOrder: 'New order',
    testNotification: 'Test notification — tap to confirm',
    needAssistance: 'A guest needs assistance',
    requestBill: 'Guest requested the bill',
    callStaff: 'Guest called staff',
    genericUpdate: 'New update',
  },
  zh: {
    newOrder: '有新订单',
    testNotification: '测试通知——点开以确认',
    needAssistance: '顾客需要帮助',
    requestBill: '顾客请求买单',
    callStaff: '顾客呼叫服务员',
    genericUpdate: '有新动态',
  },
  ja: {
    newOrder: '新しい注文があります',
    testNotification: 'テスト通知 — タップして確認',
    needAssistance: 'お客様がサポートを求めています',
    requestBill: 'お客様がお会計を希望しています',
    callStaff: 'お客様がスタッフを呼んでいます',
    genericUpdate: '新しい更新があります',
  },
  vi: {
    newOrder: 'Có đơn hàng mới',
    testNotification: 'Thông báo thử nghiệm — chạm để xác nhận',
    needAssistance: 'Khách cần hỗ trợ',
    requestBill: 'Khách gọi tính tiền',
    callStaff: 'Khách gọi nhân viên',
    genericUpdate: 'Có cập nhật mới',
  },
};

/** baseLocale 是任意 BCP-47 短码，不在四语内时回落 DEFAULT_LOCALE */
export function getPushCopy(baseLocale: string | null | undefined): PushCopy {
  return PUSH_COPY[isLocale(baseLocale) ? baseLocale : DEFAULT_LOCALE];
}
