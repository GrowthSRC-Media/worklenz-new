import DOMPurify from 'dompurify';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

const renderInlineMarkdown = (text: string, mentionNames: string[] = []): string => {
  let html = escapeHtml(text);

  html = html.replace(
    /(^|[\s(])((https?:\/\/[^\s<]+|www\.[^\s<]+))/gi,
    (_match, prefix: string, rawUrl: string) =>
      `${prefix}<a href="${escapeHtml(normalizeUrl(rawUrl))}" target="_blank" rel="noopener noreferrer">${rawUrl}</a>`
  );

  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|www\.[^\s)]+)\)/g,
    (_match, label: string, url: string) =>
      `<a href="${escapeHtml(normalizeUrl(url))}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  for (const mentionName of mentionNames) {
    const escapedName = escapeRegExp(mentionName);
    html = html.replace(
      new RegExp(`(^|[^\\w])(@${escapedName})(?=$|[^\\w])`, 'g'),
      '$1<span class="mentions">$2</span>'
    );
  }

  return html;
};

const closeList = (listType: 'ul' | 'ol' | null, items: string[]): string => {
  if (!listType || !items.length) return '';
  return `<${listType}>${items.map(item => `<li>${item}</li>`).join('')}</${listType}>`;
};

export const renderMarkdown = (input?: string | null, mentionNames: string[] = []): string => {
  if (!input) return '';

  const normalized = input.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  const lines = normalized.split('\n');
  const blocks: string[] = [];
  let paragraphLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const content = paragraphLines.map(line => renderInlineMarkdown(line, mentionNames)).join('<br />');
    blocks.push(`<p>${content}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    const listHtml = closeList(listType, listItems);
    if (listHtml) blocks.push(listHtml);
    listType = null;
    listItems = [];
  };

  const flushCodeBlock = () => {
    if (!codeLines.length) return;
    blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine ?? '';
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2], mentionNames)}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push('<hr />');
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(renderInlineMarkdown(unorderedMatch[1], mentionNames));
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(renderInlineMarkdown(orderedMatch[1], mentionNames));
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${renderInlineMarkdown(quoteMatch[1], mentionNames)}</blockquote>`);
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  if (inCodeBlock) flushCodeBlock();

  return DOMPurify.sanitize(blocks.join(''), {
    ALLOWED_TAGS: [
      'a',
      'blockquote',
      'br',
      'code',
      'del',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'li',
      'ol',
      'p',
      'pre',
      'span',
      'strong',
      'ul',
    ],
    ALLOWED_ATTR: ['class', 'href', 'rel', 'target'],
  });
};

export const markdownToPlainText = (input?: string | null): string => {
  if (!input) return '';

  return input
    .replace(/\r\n/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_~>#-]/g, ' ')
    .replace(/\d+\.\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
