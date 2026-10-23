// Export history to CSV, JSON, or TXT
import type { HistoryItem } from '../store/types';
import { shareService } from './shareService';

export type ExportFormat = 'csv' | 'json' | 'txt';

function itemsToCsv(items: HistoryItem[]): string {
  const header = 'id,type,format,content,source,favorite,timestamp\n';
  const rows = items.map((i) => {
    const content = `"${i.content.replace(/"/g, '""')}"`;
    return `${i.id},${i.type},${i.format},${content},${i.source},${i.favorite},${i.timestamp}`;
  });
  return header + rows.join('\n');
}

function itemsToJson(items: HistoryItem[]): string {
  return JSON.stringify(items, null, 2);
}

function itemsToTxt(items: HistoryItem[]): string {
  return items
    .map(
      (i) =>
        `[${new Date(i.timestamp).toLocaleString()}] (${i.type}/${i.format}) ${i.content}`
    )
    .join('\n\n');
}

export async function exportHistory(
  items: HistoryItem[],
  format: ExportFormat
): Promise<void> {
  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case 'csv':
      content = itemsToCsv(items);
      filename = `scanpro_history_${Date.now()}.csv`;
      mimeType = 'text/csv';
      break;
    case 'json':
      content = itemsToJson(items);
      filename = `scanpro_history_${Date.now()}.json`;
      mimeType = 'application/json';
      break;
    case 'txt':
      content = itemsToTxt(items);
      filename = `scanpro_history_${Date.now()}.txt`;
      mimeType = 'text/plain';
      break;
  }

  await shareService.shareDataFile({
    title: `ScanPro History (${format.toUpperCase()})`,
    filename,
    content,
    mimeType,
    dialogTitle: 'Export History',
  });
}
