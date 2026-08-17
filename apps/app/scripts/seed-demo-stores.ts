/**
 * 演示门店造数脚本：向本地 miniflare D1 写入 6 个演示门店，供截图管线使用。
 *
 * 用法：在 apps/app 下 `pnpm exec tsx scripts/seed-demo-stores.ts`
 * 依赖：本地 wrangler D1 state（apps/app/.wrangler/state/v3/d1）存在且已迁移。
 * 幂等：已存在的 store slug 会报错，提示先清理。
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import {
  createCategory,
  createCustomerOrder,
  createDb,
  createDiningTable,
  createItem,
  createModifier,
  createModifierGroup,
  createPickupPoint,
  createStoreForOwner,
  type OrderStatus,
  publishMenu,
  type StoreContext,
  setItemImageKey,
  transitionOrder,
} from '@taomenu/db';
import {
  menuCategoryTranslations,
  menuItems,
  menuItemTranslations,
  modifierGroupTranslations,
  modifierTranslations,
  stores,
  user as userTable,
} from '@taomenu/db/schema';
import { eq, inArray } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OWNER_EMAIL = 'demo@taomenu.app';
const OWNER_USER_ID = 'usr_demo_owner';

type SqlParam = null | number | bigint | string | Uint8Array;

function openLocalD1(sqlitePath: string) {
  const sqlite = new DatabaseSync(sqlitePath);
  sqlite.exec('PRAGMA journal_mode = WAL;');
  return {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...params: SqlParam[]) {
          return {
            async all() {
              return { success: true, results: statement.all(...params), meta: {} };
            },
            async raw() {
              return statement.all(...params).map((row) => Object.values(row));
            },
            async run() {
              const result = statement.run(...params);
              return { success: true, meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  };
}

function findLocalD1(): string {
  const dir = path.resolve(__dirname, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  const candidates = readdirSync(dir)
    .filter((f) => f.endsWith('.sqlite'))
    .map((f) => path.join(dir, f));
  const withStores = candidates.filter((file) => {
    try {
      const sqlite = new DatabaseSync(file, { readOnly: true });
      const row = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stores'")
        .get();
      sqlite.close();
      return Boolean(row);
    } catch {
      return false;
    }
  });
  if (withStores.length === 0) {
    throw new Error(`未找到含 stores 表的本地 D1：${dir}`);
  }
  withStores.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  console.log('使用本地 D1:', withStores[0]);
  return withStores[0]!;
}

function now() {
  return new Date();
}

/** 按订单状态机推导 submitted → target 的路径。 */
function transitionPath(
  from: OrderStatus,
  to: OrderStatus,
  mode: 'dine_in' | 'pickup',
): OrderStatus[] {
  const chain: OrderStatus[] =
    mode === 'dine_in' ? ['accepted', 'served'] : ['accepted', 'ready_for_pickup', 'picked_up'];
  const start = from === 'submitted' ? -1 : chain.indexOf(from);
  const end = chain.indexOf(to);
  if (end === -1 || end <= start) {
    return [];
  }
  return chain.slice(start + 1, end + 1);
}

type MenuItemSpec = {
  name: string;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  description?: string;
  priceAmount: number;
  image: string;
  isSoldOut?: boolean;
  modifierGroups?: Array<{
    name: string;
    nameEn: string;
    nameZh: string;
    nameJa: string;
    isRequired?: boolean;
    minSelected?: number;
    maxSelected?: number;
    options: Array<{
      name: string;
      nameEn: string;
      nameZh: string;
      nameJa: string;
      priceDeltaAmount?: number;
    }>;
  }>;
};

type StoreSpec = {
  slug: string;
  name: string;
  serviceMode: 'table_service' | 'counter_pickup' | 'hybrid';
  plan: 'free' | 'pro';
  baseLocale: string;
  tagline: string;
  categories: Array<{
    name: string;
    nameEn: string;
    nameZh: string;
    nameJa: string;
    items: MenuItemSpec[];
  }>;
  tables?: string[];
  pickupPoints?: string[];
  seedOrders?: Array<{
    label: string;
    fulfillment: 'dine_in' | 'pickup';
    table?: string;
    pickupPoint?: string;
    lines: Array<{ item: string; qty: number; modifierNames?: string[] }>;
    transitionTo?: 'submitted' | 'accepted' | 'served' | 'ready_for_pickup' | 'picked_up';
  }>;
};

const STORES: StoreSpec[] = [
  {
    slug: 'nha-hang-pho-xua',
    name: 'Nhà hàng Phố Xưa',
    serviceMode: 'table_service',
    plan: 'pro',
    baseLocale: 'vi',
    tagline: 'Nhà hàng phở & món Việt',
    categories: [
      {
        name: 'Món khai vị',
        nameEn: 'Starters',
        nameZh: '开胃菜',
        nameJa: '前菜',
        items: [
          {
            name: 'Gỏi cuốn',
            nameEn: 'Fresh spring rolls',
            nameZh: '越南春卷',
            nameJa: '生春巻き',
            description: 'Tôm, thịt heo, bún tươi cuốn bánh tráng',
            priceAmount: 35000,
            image: 'goi-cuon',
          },
          {
            name: 'Nem rán',
            nameEn: 'Fried spring rolls',
            nameZh: '炸春卷',
            nameJa: '揚げ春巻き',
            description: 'Giòn rụm, chấm nước mắm chua ngọt',
            priceAmount: 40000,
            image: 'nem-ran',
          },
        ],
      },
      {
        name: 'Món chính',
        nameEn: 'Main dishes',
        nameZh: '主菜',
        nameJa: 'メインディッシュ',
        items: [
          {
            name: 'Phở bò',
            nameEn: 'Beef noodle soup',
            nameZh: '牛肉河粉',
            nameJa: 'フォー・ボー',
            description: 'Nước dùng ninh xương 12 giờ, thịt bò tái',
            priceAmount: 60000,
            image: 'pho-bo',
            modifierGroups: [
              {
                name: 'Loại thịt',
                nameEn: 'Meat choice',
                nameZh: '肉类选择',
                nameJa: '肉の種類',
                isRequired: true,
                minSelected: 1,
                maxSelected: 1,
                options: [
                  { name: 'Bò tái', nameEn: 'Rare beef', nameZh: '半熟牛肉', nameJa: 'レアビーフ' },
                  {
                    name: 'Bò chín',
                    nameEn: 'Well-done beef',
                    nameZh: '全熟牛肉',
                    nameJa: 'ウェルダンビーフ',
                  },
                  {
                    name: 'Gân',
                    nameEn: 'Tendon',
                    nameZh: '牛筋',
                    nameJa: 'スジ',
                    priceDeltaAmount: 5000,
                  },
                ],
              },
              {
                name: 'Gia vị',
                nameEn: 'Extras',
                nameZh: '加料',
                nameJa: '追加トッピング',
                maxSelected: 3,
                options: [
                  { name: 'Thêm ớt', nameEn: 'Extra chili', nameZh: '加辣椒', nameJa: 'チリ追加' },
                  {
                    name: 'Thêm chanh',
                    nameEn: 'Extra lime',
                    nameZh: '加青柠',
                    nameJa: 'ライム追加',
                  },
                  {
                    name: 'Thêm hành',
                    nameEn: 'Extra onion',
                    nameZh: '加洋葱',
                    nameJa: '玉ねぎ追加',
                  },
                ],
              },
            ],
          },
          {
            name: 'Bún chả',
            nameEn: 'Grilled pork with rice noodles',
            nameZh: '烤肉米粉',
            nameJa: 'ブンチャー',
            description: 'Chả thịt nướng than hoa, nước chấm chua ngọt',
            priceAmount: 55000,
            image: 'bun-cha',
          },
          {
            name: 'Cơm tấm sườn',
            nameEn: 'Broken rice with pork chop',
            nameZh: '碎米烤猪排饭',
            nameJa: 'コムタム',
            description: 'Sườn nướng, bì, chả trứng ăn kèm dưa leo',
            priceAmount: 50000,
            image: 'com-tam',
          },
        ],
      },
      {
        name: 'Đồ uống',
        nameEn: 'Drinks',
        nameZh: '饮品',
        nameJa: 'ドリンク',
        items: [
          {
            name: 'Cà phê sữa đá',
            nameEn: 'Vietnamese iced coffee',
            nameZh: '越南冰咖啡',
            nameJa: 'ベトナムアイスコーヒー',
            description: 'Cà phê phin pha đậm, sữa đặc, đá',
            priceAmount: 30000,
            image: 'caphe-sua-da',
            modifierGroups: [
              {
                name: 'Đường',
                nameEn: 'Sugar',
                nameZh: '糖度',
                nameJa: '砂糖',
                maxSelected: 1,
                options: [
                  { name: 'Không đường', nameEn: 'No sugar', nameZh: '无糖', nameJa: '砂糖なし' },
                  { name: 'Ít đường', nameEn: 'Less sugar', nameZh: '少糖', nameJa: '少なめ' },
                  {
                    name: 'Đường thường',
                    nameEn: 'Normal sugar',
                    nameZh: '正常糖',
                    nameJa: '普通',
                  },
                ],
              },
            ],
          },
          {
            name: 'Trà sen',
            nameEn: 'Lotus tea',
            nameZh: '莲花茶',
            nameJa: '蓮茶',
            description: 'Trà ướp hoa sen, mát lành',
            priceAmount: 25000,
            image: 'tra-sen',
          },
        ],
      },
      {
        name: 'Tráng miệng',
        nameEn: 'Desserts',
        nameZh: '甜点',
        nameJa: 'デザート',
        items: [
          {
            name: 'Chè ba màu',
            nameEn: 'Three-color dessert',
            nameZh: '三色甜品',
            nameJa: 'チェーバーマウ',
            description: 'Đậu đỏ, đậu xanh, thạch, nước cốt dừa',
            priceAmount: 25000,
            image: 'che-ba-mau',
          },
        ],
      },
    ],
    tables: ['1', '2', '3', '4', '5', '6'],
    seedOrders: [
      {
        label: 'pho-table',
        fulfillment: 'dine_in',
        table: '2',
        lines: [
          { item: 'Phở bò', qty: 1, modifierNames: ['Bò tái', 'Thêm ớt'] },
          { item: 'Cà phê sữa đá', qty: 2, modifierNames: ['Đường thường'] },
        ],
        transitionTo: 'accepted',
      },
      {
        label: 'bun-table',
        fulfillment: 'dine_in',
        table: '5',
        lines: [
          { item: 'Bún chả', qty: 2 },
          { item: 'Trà sen', qty: 1 },
        ],
        transitionTo: 'served',
      },
    ],
  },
  {
    slug: 'tiem-banh-mi-saigon',
    name: 'Tiệm Bánh Mì Sài Gòn',
    serviceMode: 'counter_pickup',
    plan: 'free',
    baseLocale: 'vi',
    tagline: 'Bánh mì nóng giòn mỗi sáng',
    categories: [
      {
        name: 'Bánh mì',
        nameEn: 'Banh mi',
        nameZh: '法棍三明治',
        nameJa: 'バインミー',
        items: [
          {
            name: 'Bánh mì thịt nguội',
            nameEn: 'Cold cuts banh mi',
            nameZh: '冷切肉法棍',
            nameJa: 'ハムバインミー',
            description: 'Chả lụa, thịt nguội, patê, rau thơm',
            priceAmount: 25000,
            image: 'banh-mi-thit-nguoi',
            modifierGroups: [
              {
                name: 'Kích cỡ',
                nameEn: 'Size',
                nameZh: '尺寸',
                nameJa: 'サイズ',
                isRequired: true,
                minSelected: 1,
                maxSelected: 1,
                options: [
                  { name: 'Nhỏ', nameEn: 'Small', nameZh: '小份', nameJa: '小' },
                  {
                    name: 'Lớn',
                    nameEn: 'Large',
                    nameZh: '大份',
                    nameJa: '大',
                    priceDeltaAmount: 5000,
                  },
                ],
              },
              {
                name: 'Vị cay',
                nameEn: 'Spice level',
                nameZh: '辣度',
                nameJa: '辛さ',
                maxSelected: 1,
                options: [
                  { name: 'Không cay', nameEn: 'No chili', nameZh: '不辣', nameJa: '辛くない' },
                  { name: 'Cay vừa', nameEn: 'Medium', nameZh: '中辣', nameJa: '中辛' },
                  { name: 'Cay nhiều', nameEn: 'Extra spicy', nameZh: '特辣', nameJa: '大辛' },
                ],
              },
            ],
          },
          {
            name: 'Bánh mì gà xé',
            nameEn: 'Shredded chicken banh mi',
            nameZh: '鸡肉丝法棍',
            nameJa: 'チキンバインミー',
            description: 'Gà xé, sốt mayo, rau răm',
            priceAmount: 30000,
            image: 'banh-mi-ga',
          },
          {
            name: 'Bánh mì đặc biệt',
            nameEn: 'Special banh mi',
            nameZh: '招牌法棍',
            nameJa: 'スペシャルバインミー',
            description: 'Đủ loại nhân, trứng ốp la',
            priceAmount: 35000,
            image: 'banh-mi-dac-biet',
            isSoldOut: true,
          },
        ],
      },
      {
        name: 'Bánh ngọt',
        nameEn: 'Pastries',
        nameZh: '甜点面包',
        nameJa: 'スイーツ',
        items: [
          {
            name: 'Bánh bông lan trứng',
            nameEn: 'Sponge cake',
            nameZh: '鸡蛋糕',
            nameJa: 'スポンジケーキ',
            description: 'Mềm mịn, thơm vị trứng',
            priceAmount: 15000,
            image: 'banh-bong-lan',
          },
          {
            name: 'Panna cotta trà xanh',
            nameEn: 'Matcha panna cotta',
            nameZh: '抹茶奶冻',
            nameJa: '抹茶パンナコッタ',
            description: 'Mát lạnh, vị trà xanh nhẹ',
            priceAmount: 20000,
            image: 'panna-cotta',
          },
        ],
      },
    ],
    pickupPoints: ['Quầy lấy bánh'],
    seedOrders: [
      {
        label: 'pickup-bmi',
        fulfillment: 'pickup',
        pickupPoint: 'Quầy lấy bánh',
        lines: [{ item: 'Bánh mì thịt nguội', qty: 2, modifierNames: ['Lớn', 'Cay vừa'] }],
        transitionTo: 'ready_for_pickup',
      },
      {
        label: 'pickup-banh-ngot',
        fulfillment: 'pickup',
        pickupPoint: 'Quầy lấy bánh',
        lines: [{ item: 'Bánh bông lan trứng', qty: 3 }],
        transitionTo: 'picked_up',
      },
    ],
  },
  {
    slug: 'cafe-nhanh-corner',
    name: 'Cà Phê Nhanh Corner',
    serviceMode: 'counter_pickup',
    plan: 'free',
    baseLocale: 'vi',
    tagline: 'Cà phê & trà mang đi',
    categories: [
      {
        name: 'Cà phê',
        nameEn: 'Coffee',
        nameZh: '咖啡',
        nameJa: 'コーヒー',
        items: [
          {
            name: 'Cà phê sữa đá',
            nameEn: 'Iced milk coffee',
            nameZh: '越南冰咖啡',
            nameJa: 'アイスミルクコーヒー',
            description: 'Phin truyền thống, sữa đặc',
            priceAmount: 28000,
            image: 'caphe-sua-da',
            modifierGroups: [
              {
                name: 'Đường',
                nameEn: 'Sugar',
                nameZh: '糖度',
                nameJa: '砂糖',
                isRequired: true,
                minSelected: 1,
                maxSelected: 1,
                options: [
                  { name: 'Không đường', nameEn: 'No sugar', nameZh: '无糖', nameJa: '砂糖なし' },
                  { name: 'Ít đường', nameEn: 'Less sugar', nameZh: '少糖', nameJa: '少なめ' },
                  {
                    name: 'Đường thường',
                    nameEn: 'Normal sugar',
                    nameZh: '正常糖',
                    nameJa: '普通',
                  },
                ],
              },
              {
                name: 'Đá',
                nameEn: 'Ice',
                nameZh: '冰量',
                nameJa: '氷',
                isRequired: true,
                minSelected: 1,
                maxSelected: 1,
                options: [
                  { name: 'Không đá', nameEn: 'No ice', nameZh: '去冰', nameJa: '氷なし' },
                  { name: 'Ít đá', nameEn: 'Less ice', nameZh: '少冰', nameJa: '少なめ' },
                  { name: 'Nhiều đá', nameEn: 'Extra ice', nameZh: '多冰', nameJa: '多め' },
                ],
              },
              {
                name: 'Sữa',
                nameEn: 'Milk',
                nameZh: '奶类',
                nameJa: 'ミルク',
                maxSelected: 1,
                options: [
                  {
                    name: 'Sữa đặc',
                    nameEn: 'Condensed milk',
                    nameZh: '炼乳',
                    nameJa: 'コンデンスミルク',
                  },
                  {
                    name: 'Sữa tươi',
                    nameEn: 'Fresh milk',
                    nameZh: '鲜奶',
                    nameJa: '牛乳',
                    priceDeltaAmount: 3000,
                  },
                ],
              },
            ],
          },
          {
            name: 'Cà phê đen',
            nameEn: 'Black coffee',
            nameZh: '黑咖啡',
            nameJa: 'ブラックコーヒー',
            description: 'Đậm vị, rang xay mỗi ngày',
            priceAmount: 20000,
            image: 'caphe-den',
          },
        ],
      },
      {
        name: 'Trà & Sinh tố',
        nameEn: 'Tea & smoothies',
        nameZh: '茶与冰沙',
        nameJa: '紅茶・スムージー',
        items: [
          {
            name: 'Trà sữa trân châu',
            nameEn: 'Bubble milk tea',
            nameZh: '珍珠奶茶',
            nameJa: 'タピオカミルクティー',
            description: 'Trà đen, sữa, trân châu đường đen',
            priceAmount: 35000,
            image: 'tra-sua',
            modifierGroups: [
              {
                name: 'Topping',
                nameEn: 'Toppings',
                nameZh: '加料',
                nameJa: 'トッピング',
                maxSelected: 3,
                options: [
                  {
                    name: 'Trân châu đen',
                    nameEn: 'Tapioca pearls',
                    nameZh: '黑珍珠',
                    nameJa: 'タピオカ',
                    priceDeltaAmount: 5000,
                  },
                  {
                    name: 'Thạch trái cây',
                    nameEn: 'Fruit jelly',
                    nameZh: '水果冻',
                    nameJa: 'フルーツゼリー',
                    priceDeltaAmount: 5000,
                  },
                  {
                    name: 'Pudding',
                    nameEn: 'Pudding',
                    nameZh: '布丁',
                    nameJa: 'プリン',
                    priceDeltaAmount: 5000,
                  },
                ],
              },
            ],
          },
          {
            name: 'Sinh tố bơ',
            nameEn: 'Avocado smoothie',
            nameZh: '牛油果冰沙',
            nameJa: 'アボカドスムージー',
            description: 'Bơ chín, sữa đặc, đá bào',
            priceAmount: 40000,
            image: 'sinh-to-bo',
          },
        ],
      },
    ],
    pickupPoints: ['Quầy pickup'],
    seedOrders: [
      {
        label: 'pickup-cafe',
        fulfillment: 'pickup',
        pickupPoint: 'Quầy pickup',
        lines: [
          { item: 'Cà phê sữa đá', qty: 2, modifierNames: ['Ít đường', 'Nhiều đá', 'Sữa đặc'] },
          { item: 'Trà sữa trân châu', qty: 1, modifierNames: ['Trân châu đen'] },
        ],
        transitionTo: 'ready_for_pickup',
      },
    ],
  },
  {
    slug: 'quan-an-sang-binh-minh',
    name: 'Quán Ăn Sáng Bình Minh',
    serviceMode: 'hybrid',
    plan: 'free',
    baseLocale: 'vi',
    tagline: 'Phở, bún, xôi nóng hổi',
    categories: [
      {
        name: 'Phở & Bún',
        nameEn: 'Noodle soups',
        nameZh: '汤粉',
        nameJa: '麺料理',
        items: [
          {
            name: 'Phở gà',
            nameEn: 'Chicken noodle soup',
            nameZh: '鸡肉河粉',
            nameJa: 'フォーガー',
            description: 'Gà ta luộc, nước dùng ngọt thanh',
            priceAmount: 45000,
            image: 'pho-ga',
            modifierGroups: [
              {
                name: 'Nước dùng',
                nameEn: 'Broth',
                nameZh: '汤量',
                nameJa: 'スープ',
                maxSelected: 1,
                options: [
                  { name: 'Nước thường', nameEn: 'Regular', nameZh: '正常', nameJa: '普通' },
                  { name: 'Ít nước', nameEn: 'Less broth', nameZh: '少汤', nameJa: '少なめ' },
                ],
              },
              {
                name: 'Hành',
                nameEn: 'Onion',
                nameZh: '洋葱',
                nameJa: '玉ねぎ',
                maxSelected: 1,
                options: [
                  { name: 'Không hành', nameEn: 'No onion', nameZh: '不要', nameJa: 'なし' },
                  { name: 'Nhiều hành', nameEn: 'Extra onion', nameZh: '多加', nameJa: '多め' },
                ],
              },
            ],
          },
          {
            name: 'Bún đậu mắm tôm',
            nameEn: 'Noodles with fermented shrimp paste',
            nameZh: '豆腐配虾酱米线',
            nameJa: 'ブン・ダウ',
            description: 'Đậu rán giòn, chả cốm, mắm tôm',
            priceAmount: 50000,
            image: 'bun-dau',
          },
        ],
      },
      {
        name: 'Xôi & Đồ ăn nhanh sáng',
        nameEn: 'Sticky rice & quick bites',
        nameZh: '糯米饭',
        nameJa: 'もち米',
        items: [
          {
            name: 'Xôi xéo',
            nameEn: 'Sticky rice with mung bean',
            nameZh: '绿豆糯米饭',
            nameJa: 'ソイシェオ',
            description: 'Xôi đậu xanh, hành phi, chả',
            priceAmount: 25000,
            image: 'xoi-xeo',
          },
          {
            name: 'Bánh mì ốp la',
            nameEn: 'Banh mi with fried egg',
            nameZh: '煎蛋法棍',
            nameJa: '目玉焼きバインミー',
            description: 'Trứng ốp la, patê, rau',
            priceAmount: 28000,
            image: 'banh-mi-op-la',
          },
        ],
      },
      {
        name: 'Đồ uống sáng',
        nameEn: 'Morning drinks',
        nameZh: '晨间饮品',
        nameJa: '朝のドリンク',
        items: [
          {
            name: 'Sữa đậu nành',
            nameEn: 'Soy milk',
            nameZh: '豆浆',
            nameJa: '豆乳',
            description: 'Nóng hoặc lạnh, thêm đường tùy chọn',
            priceAmount: 12000,
            image: 'sua-dau-nanh',
          },
        ],
      },
    ],
    tables: ['1', '2', '3'],
    pickupPoints: ['Quầy lấy món'],
    seedOrders: [
      {
        label: 'pickup-sang',
        fulfillment: 'pickup',
        pickupPoint: 'Quầy lấy món',
        lines: [
          { item: 'Phở gà', qty: 1, modifierNames: ['Nước thường', 'Nhiều hành'] },
          { item: 'Xôi xéo', qty: 1 },
        ],
        transitionTo: 'ready_for_pickup',
      },
    ],
  },
  {
    slug: 'fastfood-viet',
    name: 'FastFood Việt',
    serviceMode: 'counter_pickup',
    plan: 'free',
    baseLocale: 'vi',
    tagline: 'Cơm & gà rán nhanh gọn',
    categories: [
      {
        name: 'Combo',
        nameEn: 'Combos',
        nameZh: '套餐',
        nameJa: 'セット',
        items: [
          {
            name: 'Combo gà rán',
            nameEn: 'Fried chicken combo',
            nameZh: '炸鸡套餐',
            nameJa: 'フライドチキンセット',
            description: '1 gà rán, 1 khoai tây chiên, 1 nước',
            priceAmount: 89000,
            image: 'combo-ga-ran',
            modifierGroups: [
              {
                name: 'Chọn nước',
                nameEn: 'Choose drink',
                nameZh: '选择饮品',
                nameJa: 'ドリンク選択',
                isRequired: true,
                minSelected: 1,
                maxSelected: 1,
                options: [
                  { name: 'Coca', nameEn: 'Coca', nameZh: '可乐', nameJa: 'コーラ' },
                  { name: 'Trà đá', nameEn: 'Iced tea', nameZh: '冰茶', nameJa: 'アイスティー' },
                  {
                    name: 'Cà phê đen',
                    nameEn: 'Black coffee',
                    nameZh: '黑咖啡',
                    nameJa: 'ブラックコーヒー',
                  },
                ],
              },
            ],
          },
          {
            name: 'Combo cơm gà xối mỡ',
            nameEn: 'Roast chicken rice combo',
            nameZh: '脆皮鸡饭套餐',
            nameJa: 'ローストチキンライスセット',
            description: 'Cơm gà xối mỡ, canh, nước mắm gừng',
            priceAmount: 75000,
            image: 'combo-com-ga',
          },
        ],
      },
      {
        name: 'Món chính',
        nameEn: 'Mains',
        nameZh: '主菜',
        nameJa: 'メイン',
        items: [
          {
            name: 'Cơm tấm sườn non',
            nameEn: 'Broken rice with ribs',
            nameZh: '烤肋排饭',
            nameJa: 'コムタム・スオンノン',
            description: 'Sườn non nướng mật ong',
            priceAmount: 55000,
            image: 'com-tam',
          },
          {
            name: 'Gà rán giòn',
            nameEn: 'Crispy fried chicken',
            nameZh: '香脆炸鸡',
            nameJa: 'クリスピーチキン',
            description: 'Da giòn, thịt mềm, sốt tùy chọn',
            priceAmount: 45000,
            image: 'ga-ran',
            modifierGroups: [
              {
                name: 'Sốt',
                nameEn: 'Sauce',
                nameZh: '酱料',
                nameJa: 'ソース',
                maxSelected: 1,
                options: [
                  { name: 'Sốt BBQ', nameEn: 'BBQ sauce', nameZh: '烧烤酱', nameJa: 'BBQソース' },
                  {
                    name: 'Sốt phô mai',
                    nameEn: 'Cheese sauce',
                    nameZh: '芝士酱',
                    nameJa: 'チーズソース',
                    priceDeltaAmount: 5000,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Món phụ',
        nameEn: 'Sides',
        nameZh: '小食',
        nameJa: 'サイド',
        items: [
          {
            name: 'Khoai tây chiên',
            nameEn: 'French fries',
            nameZh: '炸薯条',
            nameJa: 'フライドポテト',
            description: 'Vàng giòn, muối tiêu',
            priceAmount: 20000,
            image: 'khoai-tay',
          },
        ],
      },
    ],
    pickupPoints: ['Quầy lấy đồ'],
    seedOrders: [
      {
        label: 'pickup-fastfood',
        fulfillment: 'pickup',
        pickupPoint: 'Quầy lấy đồ',
        lines: [
          { item: 'Combo gà rán', qty: 1, modifierNames: ['Coca'] },
          { item: 'Khoai tây chiên', qty: 2 },
        ],
        transitionTo: 'ready_for_pickup',
      },
    ],
  },
  {
    slug: 'che-3-mien',
    name: 'Chè 3 Miền',
    serviceMode: 'counter_pickup',
    plan: 'free',
    baseLocale: 'vi',
    tagline: 'Chè Bắc – Trung – Nam',
    categories: [
      {
        name: 'Chè truyền thống',
        nameEn: 'Traditional desserts',
        nameZh: '传统甜品',
        nameJa: '伝統デザート',
        items: [
          {
            name: 'Chè ba màu',
            nameEn: 'Three-color dessert',
            nameZh: '三色甜品',
            nameJa: 'チェーバーマウ',
            description: 'Đậu đỏ, đậu xanh, thạch, cốt dừa',
            priceAmount: 25000,
            image: 'che-ba-mau',
            modifierGroups: [
              {
                name: 'Nhiệt độ',
                nameEn: 'Temperature',
                nameZh: '冷热',
                nameJa: '温度',
                isRequired: true,
                minSelected: 1,
                maxSelected: 1,
                options: [
                  { name: 'Nóng', nameEn: 'Hot', nameZh: '热', nameJa: '温かい' },
                  { name: 'Lạnh', nameEn: 'Cold', nameZh: '冷', nameJa: '冷たい' },
                ],
              },
              {
                name: 'Đường',
                nameEn: 'Sugar level',
                nameZh: '糖度',
                nameJa: '甘さ',
                maxSelected: 1,
                options: [
                  { name: 'Không đường', nameEn: 'No sugar', nameZh: '无糖', nameJa: '甘さなし' },
                  { name: 'Ít đường', nameEn: 'Less sugar', nameZh: '少糖', nameJa: '甘さ控えめ' },
                  { name: 'Ngọt', nameEn: 'Sweet', nameZh: '正常甜', nameJa: '甘め' },
                ],
              },
              {
                name: 'Topping',
                nameEn: 'Toppings',
                nameZh: '加料',
                nameJa: 'トッピング',
                maxSelected: 2,
                options: [
                  {
                    name: 'Thạch dừa',
                    nameEn: 'Coconut jelly',
                    nameZh: '椰果冻',
                    nameJa: 'ココナッツゼリー',
                    priceDeltaAmount: 5000,
                  },
                  {
                    name: 'Trân châu',
                    nameEn: 'Tapioca pearls',
                    nameZh: '珍珠',
                    nameJa: 'タピオカ',
                    priceDeltaAmount: 5000,
                  },
                  {
                    name: 'Đậu phộng',
                    nameEn: 'Peanuts',
                    nameZh: '花生',
                    nameJa: 'ピーナッツ',
                    priceDeltaAmount: 3000,
                  },
                ],
              },
            ],
          },
          {
            name: 'Chè bưởi',
            nameEn: 'Pomelo dessert',
            nameZh: '柚子甜品',
            nameJa: 'ブオイ（文旦）チェー',
            description: 'Múi bưởi, đậu xanh, nước đường thơm',
            priceAmount: 22000,
            image: 'che-buoi',
          },
          {
            name: 'Sữa chua nếp cẩm',
            nameEn: 'Yogurt with black rice',
            nameZh: '黑糯米酸奶',
            nameJa: '黒米ヨーグルト',
            description: 'Nếp cẩm dẻo, sữa chua thanh mát',
            priceAmount: 28000,
            image: 'sua-chua-nep-cam',
          },
        ],
      },
    ],
    pickupPoints: ['Quầy chè'],
    seedOrders: [
      {
        label: 'pickup-che',
        fulfillment: 'pickup',
        pickupPoint: 'Quầy chè',
        lines: [{ item: 'Chè ba màu', qty: 2, modifierNames: ['Lạnh', 'Ít đường', 'Thạch dừa'] }],
        transitionTo: 'ready_for_pickup',
      },
    ],
  },
];

async function ensureDemoUser(db: Awaited<ReturnType<typeof createDb>>) {
  const rows = await db.select().from(userTable).where(eq(userTable.email, OWNER_EMAIL)).limit(1);
  if (rows[0]) {
    return rows[0];
  }
  const createdAt = now();
  const row = {
    id: OWNER_USER_ID,
    name: 'Demo Owner',
    email: OWNER_EMAIL,
    emailVerified: true,
    createdAt,
    updatedAt: createdAt,
  };
  await db.insert(userTable).values(row);
  return row;
}

type OptionIndex = { groupName: string; optionName: string; modifierId: string };

async function buildStore(
  db: Awaited<ReturnType<typeof createDb>>,
  userId: string,
  spec: StoreSpec,
) {
  const existingStore = await db.select().from(stores).where(eq(stores.slug, spec.slug)).limit(1);
  if (existingStore[0]) {
    throw new Error(`Store ${spec.slug} 已存在，跳过。请先清理后再跑。`);
  }

  const created = await createStoreForOwner(db, userId, {
    name: spec.name,
    serviceMode: spec.serviceMode,
    timezone: 'Asia/Ho_Chi_Minh',
    baseLocale: spec.baseLocale,
    currency: 'VND',
  });
  const storeId = created.id;

  if (spec.plan === 'pro') {
    await db.update(stores).set({ plan: 'pro' }).where(eq(stores.id, storeId));
  }

  const ctx: StoreContext = { storeId, userId, role: 'owner', plan: spec.plan, staffSeatAddons: 0 };

  const itemIds: Record<string, string> = {};
  const optionIds: Record<string, OptionIndex> = {};
  const imageKeys: Record<string, string> = {};
  const reviewedAt = now();

  for (const cat of spec.categories) {
    const { categoryId } = await createCategory(ctx, db, {
      name: cat.name,
      locale: spec.baseLocale,
    });
    if (spec.plan === 'pro') {
      await db.insert(menuCategoryTranslations).values([
        {
          id: crypto.randomUUID(),
          storeId,
          categoryId,
          locale: 'en',
          name: cat.nameEn,
          source: 'manual',
          reviewStatus: 'reviewed',
          reviewedByUserId: userId,
          reviewedAt,
        },
        {
          id: crypto.randomUUID(),
          storeId,
          categoryId,
          locale: 'zh',
          name: cat.nameZh,
          source: 'manual',
          reviewStatus: 'reviewed',
          reviewedByUserId: userId,
          reviewedAt,
        },
        {
          id: crypto.randomUUID(),
          storeId,
          categoryId,
          locale: 'ja',
          name: cat.nameJa,
          source: 'manual',
          reviewStatus: 'reviewed',
          reviewedByUserId: userId,
          reviewedAt,
        },
      ]);
    }

    for (const item of cat.items) {
      const createdItem = await createItem(ctx, db, {
        categoryId,
        name: item.name,
        description: item.description,
        priceAmount: item.priceAmount,
        locale: spec.baseLocale,
      });
      if (!createdItem) throw new Error(`创建菜品失败: ${item.name}`);
      const { itemId } = createdItem;
      itemIds[item.name] = itemId;
      if (item.isSoldOut) {
        await db.update(menuItems).set({ isSoldOut: true }).where(eq(menuItems.id, itemId));
      }

      if (spec.plan === 'pro') {
        await db.insert(menuItemTranslations).values([
          {
            id: crypto.randomUUID(),
            storeId,
            itemId,
            locale: 'en',
            name: item.nameEn,
            description: null,
            source: 'manual',
            reviewStatus: 'reviewed',
            reviewedByUserId: userId,
            reviewedAt,
          },
          {
            id: crypto.randomUUID(),
            storeId,
            itemId,
            locale: 'zh',
            name: item.nameZh,
            description: null,
            source: 'manual',
            reviewStatus: 'reviewed',
            reviewedByUserId: userId,
            reviewedAt,
          },
          {
            id: crypto.randomUUID(),
            storeId,
            itemId,
            locale: 'ja',
            name: item.nameJa,
            description: null,
            source: 'manual',
            reviewStatus: 'reviewed',
            reviewedByUserId: userId,
            reviewedAt,
          },
        ]);
      }

      for (const group of item.modifierGroups ?? []) {
        const createdGroup = await createModifierGroup(ctx, db, {
          itemId,
          name: group.name,
          isRequired: group.isRequired,
          minSelected: group.minSelected,
          maxSelected: group.maxSelected,
          locale: spec.baseLocale,
        });
        if (!createdGroup) throw new Error(`创建选项组失败: ${group.name}`);
        const { groupId } = createdGroup;
        if (spec.plan === 'pro') {
          await db.insert(modifierGroupTranslations).values([
            {
              id: crypto.randomUUID(),
              storeId,
              modifierGroupId: groupId,
              locale: 'en',
              name: group.nameEn,
            },
            {
              id: crypto.randomUUID(),
              storeId,
              modifierGroupId: groupId,
              locale: 'zh',
              name: group.nameZh,
            },
            {
              id: crypto.randomUUID(),
              storeId,
              modifierGroupId: groupId,
              locale: 'ja',
              name: group.nameJa,
            },
          ]);
        }
        for (const opt of group.options) {
          const createdModifier = await createModifier(ctx, db, {
            groupId,
            name: opt.name,
            priceDeltaAmount: opt.priceDeltaAmount,
            locale: spec.baseLocale,
          });
          if (!createdModifier) throw new Error(`创建选项失败: ${opt.name}`);
          const { modifierId } = createdModifier;
          optionIds[`${item.name}::${opt.name}`] = {
            groupName: group.name,
            optionName: opt.name,
            modifierId,
          };
          if (spec.plan === 'pro') {
            await db.insert(modifierTranslations).values([
              {
                id: crypto.randomUUID(),
                storeId,
                modifierId,
                locale: 'en',
                name: opt.nameEn,
                source: 'manual',
                reviewStatus: 'reviewed',
                reviewedByUserId: userId,
                reviewedAt,
              },
              {
                id: crypto.randomUUID(),
                storeId,
                modifierId,
                locale: 'zh',
                name: opt.nameZh,
                source: 'manual',
                reviewStatus: 'reviewed',
                reviewedByUserId: userId,
                reviewedAt,
              },
              {
                id: crypto.randomUUID(),
                storeId,
                modifierId,
                locale: 'ja',
                name: opt.nameJa,
                source: 'manual',
                reviewStatus: 'reviewed',
                reviewedByUserId: userId,
                reviewedAt,
              },
            ]);
          }
        }
      }
    }
  }

  for (const cat of spec.categories) {
    for (const item of cat.items) {
      const itemId = itemIds[item.name]!;
      const key = `menu/${storeId}/${itemId}/${crypto.randomUUID()}.jpg`;
      await setItemImageKey(ctx, db, itemId, key);
      imageKeys[item.image] = key;
    }
  }

  const tables: Record<string, { id: string; token: string }> = {};
  for (const name of spec.tables ?? []) {
    const t = await createDiningTable(ctx, db, { name });
    tables[name] = { id: t.id, token: t.token };
  }
  const pickupPoints: Record<string, { id: string; token: string }> = {};
  for (const name of spec.pickupPoints ?? []) {
    const p = await createPickupPoint(ctx, db, { name });
    pickupPoints[name] = { id: p.id, token: p.token };
  }

  await publishMenu(ctx, db);

  const orders: Record<
    string,
    { displayNumber: number; pickupNumber: number | null; publicToken: string; status: string }
  > = {};
  for (const seed of spec.seedOrders ?? []) {
    const lines = seed.lines.map((l) => ({
      menuItemId: itemIds[l.item]!,
      quantity: l.qty,
      modifierIds: (l.modifierNames ?? [])
        .map((mn) => optionIds[`${l.item}::${mn}`]?.modifierId)
        .filter((id): id is string => Boolean(id)),
    }));
    const result = await createCustomerOrder(db, {
      storeId,
      fulfillmentMode: seed.fulfillment,
      tableId: seed.table ? tables[seed.table]?.id : undefined,
      pickupPointId: seed.pickupPoint ? pickupPoints[seed.pickupPoint]?.id : undefined,
      locale: spec.baseLocale,
      idempotencyKey: `seed-${spec.slug}-${seed.label}-${Date.now()}`,
      lines,
    });
    if (!result.ok) {
      throw new Error(`Store ${spec.slug} 创建订单失败: ${result.error}`);
    }
    const status = seed.transitionTo ?? result.status;
    if (status !== result.status) {
      const path = transitionPath(
        result.status as OrderStatus,
        status as OrderStatus,
        seed.fulfillment,
      );
      for (const step of path) {
        const trans = await transitionOrder(ctx, db, result.orderId, step);
        if (trans && !('ok' in trans)) {
          console.warn(`[warn] ${spec.slug} ${seed.label} 无法 transition 到 ${step}`);
          break;
        }
      }
    }
    orders[seed.label] = {
      displayNumber: result.displayNumber,
      pickupNumber: result.pickupNumber,
      publicToken: result.publicToken,
      status,
    };
  }

  return { spec, storeId, slug: created.slug, itemIds, imageKeys, tables, pickupPoints, orders };
}

async function main() {
  const d1Path = findLocalD1();
  const db = createDb(openLocalD1(d1Path) as never);

  const user = await ensureDemoUser(db);
  console.log('Demo user:', user.email, user.id);

  const demoNames = STORES.map((s) => s.name);
  const existing = await db
    .select({ id: stores.id })
    .from(stores)
    .where(inArray(stores.name, demoNames));
  if (existing.length > 0) {
    console.log(`清理旧演示店: ${existing.length} 家`);
    for (const row of existing) {
      await db.delete(stores).where(eq(stores.id, row.id));
    }
  }

  const results: Awaited<ReturnType<typeof buildStore>>[] = [];
  for (const spec of STORES) {
    const built = await buildStore(db, user.id, spec);
    results.push(built);
    console.log(`✓ ${built.slug} (${spec.name}) — plan=${spec.plan}`);
  }

  const manifest = {
    ownerEmail: OWNER_EMAIL,
    stores: Object.fromEntries(
      results.map((r) => [
        r.slug,
        {
          storeId: r.storeId,
          name: r.spec.name,
          plan: r.spec.plan,
          imageKeys: r.imageKeys,
          tables: r.tables,
          pickupPoints: r.pickupPoints,
          orders: r.orders,
        },
      ]),
    ),
  };
  const outPath = path.resolve(__dirname, 'demo-stores.manifest.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
