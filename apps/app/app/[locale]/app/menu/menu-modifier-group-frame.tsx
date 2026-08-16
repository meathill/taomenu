'use client';

import { CaretDownIcon, CaretUpIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { getCurrencyDecimals, sanitizeCurrencyInput } from '@taomenu/shared';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button as SaveButton } from '@/components/button';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Frame, FrameHeader, FramePanel } from '@/components/ui/frame';
import {
  createOptionDraft,
  type ModifierGroupDraft,
  type ModifierOptionDraft,
  markGroupDirty,
} from './menu-modifier-draft';

type MenuModifierGroupFrameProps = {
  draft: ModifierGroupDraft;
  currency: string;
  index: number;
  total: number;
  busyAction: string | null;
  onChange: (draft: ModifierGroupDraft) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  onSave: () => void;
};

function IconButton({
  label,
  pending,
  busy,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pending?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xl"
      aria-label={label}
      title={label}
      loading={pending}
      disabled={disabled || busy}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function MenuModifierGroupFrame({
  draft,
  currency,
  index,
  total,
  busyAction,
  onChange,
  onMove,
  onDelete,
  onSave,
}: MenuModifierGroupFrameProps) {
  const t = useTranslations('menu');
  const hasDecimals = getCurrencyDecimals(currency) > 0;
  const saveKey = `saveGroup-${draft.clientId}`;
  const deleteKey = `delGroup-${draft.serverId ?? draft.clientId}`;
  const title = draft.name.trim() || t('groupPlaceholder');

  function updateOption(
    clientId: string,
    patch: Partial<Pick<ModifierOptionDraft, 'name' | 'delta'>>,
  ) {
    onChange(
      markGroupDirty(draft, {
        options: draft.options.map((option) =>
          option.clientId === clientId ? { ...option, ...patch } : option,
        ),
      }),
    );
  }

  return (
    <Frame className="w-full">
      <Collapsible defaultOpen>
        <FrameHeader className="flex-row items-center justify-between gap-1 px-2 py-2">
          <CollapsibleTrigger
            className="data-open:[&_svg]:rotate-180"
            render={
              <Button
                variant="ghost"
                className="h-11 min-w-0 flex-1 justify-start px-2 text-sm font-semibold"
              />
            }
          >
            <CaretDownIcon
              className="size-4 shrink-0 transition-transform"
              weight="bold"
              aria-hidden
            />
            <span className="truncate">{title}</span>
          </CollapsibleTrigger>
          <div className="flex shrink-0 items-center">
            <IconButton
              label={t('moveGroupUp')}
              busy={busyAction !== null}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <CaretUpIcon className="size-5" weight="bold" aria-hidden />
            </IconButton>
            <IconButton
              label={t('moveGroupDown')}
              busy={busyAction !== null}
              disabled={index === total - 1}
              onClick={() => onMove(1)}
            >
              <CaretDownIcon className="size-5" weight="bold" aria-hidden />
            </IconButton>
            <IconButton
              label={t('deleteGroup')}
              pending={busyAction === deleteKey}
              busy={busyAction !== null}
              onClick={onDelete}
            >
              <TrashIcon className="size-5 text-brand-600" weight="bold" aria-hidden />
            </IconButton>
          </div>
        </FrameHeader>
        <CollapsiblePanel>
          <FramePanel className="space-y-3">
            <label className="block text-sm font-bold text-ink-900">
              {t('groupName')}
              <input
                value={draft.name}
                onChange={(event) => onChange(markGroupDirty(draft, { name: event.target.value }))}
                placeholder={t('groupPlaceholder')}
                className="mt-1 min-h-12 w-full rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
              />
            </label>
            <label className="flex min-h-12 items-center gap-2 text-sm font-semibold text-ink-900">
              <input
                type="checkbox"
                checked={draft.isRequired}
                onChange={(event) =>
                  onChange(markGroupDirty(draft, { isRequired: event.target.checked }))
                }
                className="size-4 accent-jade-600"
              />
              {t('groupRequired')}
            </label>

            <ul className="space-y-2">
              {draft.options.map((option) => (
                <li key={option.clientId} className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 gap-2">
                    <input
                      value={option.name}
                      onChange={(event) =>
                        updateOption(option.clientId, { name: event.target.value })
                      }
                      placeholder={t('optionName')}
                      className="min-h-12 min-w-0 flex-1 rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
                    />
                    <input
                      value={option.delta}
                      onChange={(event) =>
                        updateOption(option.clientId, {
                          delta: sanitizeCurrencyInput(event.target.value, currency),
                        })
                      }
                      placeholder={t('priceDelta')}
                      inputMode={hasDecimals ? 'decimal' : 'numeric'}
                      className="min-h-12 w-24 shrink-0 rounded-xl border border-border px-2 text-base tabular-nums outline-none ring-jade-600 focus:ring-2"
                    />
                  </div>
                  <IconButton
                    label={t('deleteOption')}
                    busy={busyAction !== null}
                    onClick={() =>
                      onChange(
                        markGroupDirty(draft, {
                          options: draft.options.filter((row) => row.clientId !== option.clientId),
                        }),
                      )
                    }
                  >
                    <TrashIcon className="size-5 text-brand-600" weight="bold" aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="ghost"
              disabled={busyAction !== null}
              className="h-11 justify-start px-2 text-jade-600"
              onClick={() =>
                onChange(
                  markGroupDirty(draft, { options: [...draft.options, createOptionDraft()] }),
                )
              }
            >
              <PlusIcon className="size-4" weight="bold" aria-hidden />
              {t('addOption')}
            </Button>

            <SaveButton
              type="button"
              pending={busyAction === saveKey}
              busy={busyAction !== null}
              disabled={!draft.name.trim()}
              onClick={onSave}
              className="min-h-12 w-full rounded-xl bg-jade-600 text-sm font-bold text-white"
            >
              {t('saveGroup')}
            </SaveButton>
          </FramePanel>
        </CollapsiblePanel>
      </Collapsible>
    </Frame>
  );
}
