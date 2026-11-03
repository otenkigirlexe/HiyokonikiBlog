import React from 'react';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

export default function MarkdownRenderer({ content }: { content: string }) {
  // 従来のHTML記事（1行＝1つの<p>タグ）と表示粒度を完全統一するため、
  // 1回の改行(\n)も段落区切り(\n\n)として扱い、すべての行を<p>タグで出力する
  const preprocessed = (content || '')
    .replace(/\r?\n/g, '\n\n')
    .replace(
      /!\[(.*?)\]\((\/assets\/[^\)]+)\)/g,
      '\n\n<div class="article-media-wrap"><a href="$2" target="_blank" rel="noopener noreferrer"><img src="$2" alt="$1"></a></div>\n\n'
    )
    .replace(
      /(<video[^>]*>[\s\S]*?<\/video>)/g,
      '\n\n<div class="article-media-wrap">$1</div>\n\n'
    );

  const html = marked.parse(preprocessed) as string;

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
