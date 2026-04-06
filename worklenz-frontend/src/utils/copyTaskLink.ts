import { message } from '@/shared/antd-imports';
import logger from '@/utils/errorLogger';

export async function copyTaskLink(
  projectId: string | undefined | null,
  taskId: string | undefined | null,
  t?: (key: string) => string
) {
  if (!projectId || !taskId) return;
  try {
    const link = `${window.location.origin}/worklenz/projects/${projectId}?tab=tasks-list&pinned_tab=tasks-list&task=${taskId}`;
    await navigator.clipboard.writeText(link);
    message.success(t ? t('contextMenu.linkCopied') : 'Link copied to clipboard');
  } catch (error) {
    logger.error('Error copying task link:', error);
    message.error(t ? t('contextMenu.linkCopyFailed') : 'Failed to copy link');
  }
}
