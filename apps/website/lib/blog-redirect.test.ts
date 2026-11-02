import { describe, expect, it } from 'vitest';
import { resolveBlogRedirect } from './blog-redirect';

describe('resolveBlogRedirect', () => {
  it('裸路径：日文 slug 归一到英文 slug', () => {
    expect(resolveBlogRedirect('/blog/tagengo-qr-menyuu')).toBe(
      '/blog/menu-da-ngon-ngu-cho-khach-du-lich',
    );
  });

  it('中文路径：日文 slug 归一到中文 slug', () => {
    expect(resolveBlogRedirect('/zh/blog/tagengo-qr-menyuu')).toBe(
      '/zh/blog/menu-da-ngon-ngu-cho-khach-du-lich',
    );
  });

  it('越南语路径：日文 slug 归一到越南语 slug', () => {
    expect(resolveBlogRedirect('/vi/blog/tagengo-qr-menyuu')).toBe(
      '/vi/blog/menu-da-ngon-ngu-cho-khach-du-lich',
    );
  });

  it('日文路径：旧越南语 slug 归一到日文 slug', () => {
    expect(resolveBlogRedirect('/ja/blog/order-bang-qr-thanh-toan-tai-quay')).toBe(
      '/ja/blog/qr-chumon-reji-kaikei',
    );
  });

  it('正确的本地化 slug 不跳转', () => {
    expect(resolveBlogRedirect('/blog/menu-da-ngon-ngu-cho-khach-du-lich')).toBeNull();
    expect(resolveBlogRedirect('/zh/blog/menu-da-ngon-ngu-cho-khach-du-lich')).toBeNull();
    expect(resolveBlogRedirect('/ja/blog/tagengo-qr-menyuu')).toBeNull();
    expect(resolveBlogRedirect('/vi/blog/menu-da-ngon-ngu-cho-khach-du-lich')).toBeNull();
  });

  it('未知 slug、列表页、尾斜杠和 /en 前缀不处理', () => {
    expect(resolveBlogRedirect('/blog/unknown-post')).toBeNull();
    expect(resolveBlogRedirect('/blog')).toBeNull();
    expect(resolveBlogRedirect('/ja/blog/tagengo-qr-menyuu/')).toBeNull();
    expect(resolveBlogRedirect('/en/blog/tagengo-qr-menyuu')).toBeNull();
  });
});
