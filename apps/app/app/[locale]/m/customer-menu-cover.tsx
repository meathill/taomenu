import { publicMediaPath } from '@/lib/menu-image';

/** 顾客菜单顶部封面；没有封面时不渲染，保持原来的简洁页头 */
export function CustomerMenuCover({ coverImageKey }: { coverImageKey?: string | null }) {
  if (!coverImageKey) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={publicMediaPath(coverImageKey)} alt="" className="h-40 w-full object-cover" />
  );
}
