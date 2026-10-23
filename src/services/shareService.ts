import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from '../utils/helpers';

export interface ShareTextOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export interface ShareImageOptions {
  title?: string;
  dataUrl: string;
  text?: string;
  dialogTitle?: string;
  fileName?: string;
}

export interface ShareFileOptions {
  title?: string;
  filename: string;
  content: string;
  mimeType: string;
  dialogTitle?: string;
}

export const shareService = {
  /**
   * Share plain text or URL across native and web platforms with fallback
   */
  async shareText(options: ShareTextOptions): Promise<{ success: boolean; method: 'native' | 'clipboard' }> {
    const { title, text, url, dialogTitle } = options;
    const isHttp = url && /^https?:\/\//i.test(url);

    // Try native Capacitor Share first
    try {
      if (isNative()) {
        await Share.share({
          title,
          text: text || '',
          url: isHttp ? url : undefined,
          dialogTitle: dialogTitle || 'Share',
        });
        await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        return { success: true, method: 'native' };
      }
    } catch (e: unknown) {
      if ((e as Error)?.message?.includes('canceled') || (e as Error)?.message?.includes('cancelled')) {
        return { success: true, method: 'native' };
      }
      console.warn('Native share failed, falling back:', e);
    }

    // Web Share API fallback
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: isHttp ? url : undefined,
        });
        return { success: true, method: 'native' };
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return { success: true, method: 'native' };
        }
        console.warn('navigator.share failed, falling back to clipboard:', err);
      }
    }

    // Final fallback: copy text to clipboard
    const shareBody = [text, url].filter(Boolean).join('\n');
    await Clipboard.write({ string: shareBody || title || '' });
    await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    return { success: true, method: 'clipboard' };
  },

  /**
   * Share a base64 image (QR or barcode)
   * Writes to cache file for native share sheet; converts to File for web share; downloads on browser fallback
   */
  async shareImage(options: ShareImageOptions): Promise<{ success: boolean; method: 'native' | 'download' }> {
    const { title, dataUrl, text, dialogTitle, fileName } = options;
    if (!dataUrl) return { success: false, method: 'download' };

    const cleanBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const cleanTitle = (title || 'code').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const targetFileName = fileName || `ScanPro_${cleanTitle}_${Date.now()}.png`;

    // 1. Native Capacitor Share (Android / iOS)
    if (isNative()) {
      try {
        const fileResult = await Filesystem.writeFile({
          path: targetFileName,
          data: cleanBase64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: title || 'ScanPro Code',
          text: text || '',
          files: [fileResult.uri],
          dialogTitle: dialogTitle || 'Share Code Image',
        });

        await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        return { success: true, method: 'native' };
      } catch (e: unknown) {
        if ((e as Error)?.message?.includes('canceled') || (e as Error)?.message?.includes('cancelled')) {
          return { success: true, method: 'native' };
        }
        console.warn('Native image share failed, attempting web fallback:', e);
      }
    }

    // 2. Web Share API with File
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        const file = new File([blob], targetFileName, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: title || 'ScanPro Code',
            text: text || '',
            files: [file],
          });
          return { success: true, method: 'native' };
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return { success: true, method: 'native' };
        }
        console.warn('navigator.share image failed:', err);
      }
    }

    // 3. Fallback: Trigger browser image download
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = targetFileName;
      a.click();
      return { success: true, method: 'download' };
    } catch (e) {
      console.error('Image download fallback failed:', e);
      return { success: false, method: 'download' };
    }
  },

  /**
   * Share or export data file (CSV, JSON, TXT)
   */
  async shareDataFile(options: ShareFileOptions): Promise<void> {
    const { title, filename, content, mimeType, dialogTitle } = options;

    if (isNative()) {
      try {
        const fileResult = await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Cache,
          encoding: 'utf8' as never,
        });

        await Share.share({
          title: title || filename,
          files: [fileResult.uri],
          dialogTitle: dialogTitle || 'Export File',
        });
        return;
      } catch (e: unknown) {
        if ((e as Error)?.message?.includes('canceled') || (e as Error)?.message?.includes('cancelled')) {
          return;
        }
        console.warn('Native file export share failed, falling back:', e);
      }
    }

    // Web fallback: download as file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
