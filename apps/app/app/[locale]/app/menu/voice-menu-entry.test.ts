import { describe, expect, it } from 'vitest';
import { parseVoiceMenuDraft } from './voice-menu-entry';

describe('越南语菜单语音草稿', () => {
  it('解析数字和 nghìn', () => {
    expect(parseVoiceMenuDraft('Phở bò giá 55 nghìn')).toMatchObject({
      name: 'Phở bò',
      price: '55000',
    });
  });

  it('解析越南语数字词', () => {
    expect(parseVoiceMenuDraft('Cà phê sữa giá bốn mươi lăm nghìn')).toMatchObject({
      name: 'Cà phê sữa',
      price: '45000',
    });
  });

  it('解析十万以上的越南语价格', () => {
    expect(parseVoiceMenuDraft('Lẩu hải sản giá một trăm năm mươi nghìn')).toMatchObject({
      name: 'Lẩu hải sản',
      price: '150000',
    });
  });

  it('没有说价格时保留转写文本并等待手工补价', () => {
    expect(parseVoiceMenuDraft('Bánh mì đặc biệt')).toEqual({
      name: 'Bánh mì đặc biệt',
      price: '',
      transcript: 'Bánh mì đặc biệt',
    });
  });
});
