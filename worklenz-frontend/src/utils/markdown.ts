import { Editor, generateJSON } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';

/**
 * Convert a legacy HTML string (e.g. from the old TinyMCE editor) to markdown,
 * using the same Tiptap extension stack the live editor uses so the output is
 * round-trip compatible. Anything outside the supported schema is dropped
 * rather than leaked as literal text.
 */
export const htmlToMarkdown = (html: string): string => {
  if (!html) return '';
  const extensions = [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Link.configure({ openOnClick: false, autolink: true }),
    Markdown.configure({
      html: false,
      linkify: true,
      breaks: false,
      tightLists: true,
      bulletListMarker: '-',
    }),
  ];
  try {
    const json = generateJSON(html, extensions);
    const editor = new Editor({ extensions, content: json, editable: false });
    const md = (editor.storage as any).markdown?.getMarkdown?.() ?? '';
    editor.destroy();
    return md;
  } catch {
    return html;
  }
};

/**
 * Heuristic: detect if a stored content string looks like HTML.
 * Used to render legacy (TinyMCE) descriptions/comments via dangerouslySetInnerHTML
 * while new content is treated as markdown.
 */
export const isLikelyHtml = (value?: string | null): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Common HTML markers produced by the legacy TinyMCE editor / sanitizer.
  return /^<(p|div|span|h[1-6]|ul|ol|br|strong|em|a|blockquote|pre|table|img)\b/i.test(trimmed);
};

/**
 * Strip markdown syntax for plain-text previews / character counts.
 */
export const stripMarkdown = (md?: string | null): string => {
  if (!md) return '';
  return md
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]+/g, '')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
};

/**
 * Extract @mentions from a markdown string and resolve them against a member list.
 * Returns objects matching the existing backend payload shape.
 */
export const extractMentionsFromMarkdown = (
  md: string,
  members: Array<{ id?: string; name?: string }>
): Array<{ team_member_id: string; name: string }> => {
  if (!md || !members?.length) return [];
  const found = new Map<string, { team_member_id: string; name: string }>();
  // Sort members by name length desc so longer names match first.
  const sorted = [...members]
    .filter(m => m.id && m.name)
    .sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
  for (const member of sorted) {
    const escaped = (member.name as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`@${escaped}\\b`, 'i');
    if (re.test(md)) {
      found.set(member.id as string, {
        team_member_id: member.id as string,
        name: member.name as string,
      });
    }
  }
  return Array.from(found.values());
};
