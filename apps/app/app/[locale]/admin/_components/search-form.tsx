type SearchFormProps = {
  base: string;
  defaultValue: string;
  labels: { placeholder: string; submit: string };
};

/** 名录搜索。原生 form GET 提交，无客户端 JS。 */
export function SearchForm({ base, defaultValue, labels }: SearchFormProps) {
  return (
    <form action={base} method="get" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={labels.placeholder}
        className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-sm text-ink-900"
      />
      <button
        type="submit"
        className="h-10 shrink-0 rounded-xl bg-ink-900 px-4 text-sm font-bold text-white"
      >
        {labels.submit}
      </button>
    </form>
  );
}
