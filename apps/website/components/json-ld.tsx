type JsonLdProps = {
  data: Record<string, unknown>;
};

/** 注入 JSON-LD 结构化数据。data 为与页面真实内容一致的对象，不在此伪造字段。 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 内容由服务端常量构造，无用户输入
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
