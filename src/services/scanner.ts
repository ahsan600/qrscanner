// Scanner service wrapping @capacitor-mlkit/barcode-scanning
// Handles permissions, scanning, torch, zoom, and gallery import.

import {
  BarcodeScanner,
  BarcodeFormat,
  LensFacing,
} from '@capacitor-mlkit/barcode-scanning';
import type { ScanMode } from '../utils/constants';

export interface ScanResult {
  rawValue: string;
  format: string;
  cornerPoints?: { x: number; y: number }[];
}

function getFormatsForMode(mode: ScanMode): BarcodeFormat[] {
  switch (mode) {
    case 'QR':
      return [BarcodeFormat.QrCode];
    case 'Barcode':
      return [
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
        BarcodeFormat.Code128,
        BarcodeFormat.Code39,
        BarcodeFormat.Code93,
        BarcodeFormat.Itf,
        BarcodeFormat.Codabar,
        BarcodeFormat.DataMatrix,
        BarcodeFormat.Aztec,
        BarcodeFormat.Pdf417,
      ];
    case 'All':
    default:
      return [
        BarcodeFormat.QrCode,
        BarcodeFormat.DataMatrix,
        BarcodeFormat.Aztec,
        BarcodeFormat.Pdf417,
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
        BarcodeFormat.Code128,
        BarcodeFormat.Code39,
        BarcodeFormat.Code93,
        BarcodeFormat.Itf,
        BarcodeFormat.Codabar,
      ];
  }
}

// Map ML Kit format enum to readable string
function formatToString(format: BarcodeFormat): string {
  const map: Partial<Record<BarcodeFormat, string>> = {
    [BarcodeFormat.QrCode]: 'QR_CODE',
    [BarcodeFormat.DataMatrix]: 'DATA_MATRIX',
    [BarcodeFormat.Aztec]: 'AZTEC',
    [BarcodeFormat.Pdf417]: 'PDF_417',
    [BarcodeFormat.Ean13]: 'EAN_13',
    [BarcodeFormat.Ean8]: 'EAN_8',
    [BarcodeFormat.UpcA]: 'UPC_A',
    [BarcodeFormat.UpcE]: 'UPC_E',
    [BarcodeFormat.Code128]: 'CODE_128',
    [BarcodeFormat.Code39]: 'CODE_39',
    [BarcodeFormat.Code93]: 'CODE_93',
    [BarcodeFormat.Itf]: 'ITF',
    [BarcodeFormat.Codabar]: 'CODABAR',
  };
  return map[format] || String(format) || 'UNKNOWN';
}

export const scannerService = {
  async checkPermission(): Promise<{ granted: boolean; deniedPermanently: boolean }> {
    try {
      const status = await BarcodeScanner.checkPermissions();
      if (status.camera === 'granted') {
        return { granted: true, deniedPermanently: false };
      }
      if (status.camera === 'denied') {
        return { granted: false, deniedPermanently: true };
      }
      return { granted: false, deniedPermanently: false };
    } catch {
      return { granted: false, deniedPermanently: false };
    }
  },

  async requestPermission(): Promise<{ granted: boolean; deniedPermanently: boolean }> {
    try {
      const status = await BarcodeScanner.requestPermissions();
      if (status.camera === 'granted') {
        return { granted: true, deniedPermanently: false };
      }
      if (status.camera === 'denied') {
        return { granted: false, deniedPermanently: true };
      }
      return { granted: false, deniedPermanently: false };
    } catch {
      return { granted: false, deniedPermanently: false };
    }
  },

  async startScan(
    mode: ScanMode,
    onResult: (result: ScanResult) => void
  ): Promise<void> {
    const formats = getFormatsForMode(mode);

    // Make the WebView transparent so the camera preview shows through
    document.querySelector('body')?.classList.add('barcode-scanner-active');
    document.querySelector('html')?.classList.add('barcode-scanner-active');

    try {
      await BarcodeScanner.addListener('barcodesScanned', (event) => {
        if (event.barcodes && event.barcodes.length > 0) {
          const barcode = event.barcodes[0];
          onResult({
            rawValue: barcode.rawValue || '',
            format: formatToString(barcode.format),
            cornerPoints: barcode.cornerPoints as { x: number; y: number }[] | undefined,
          });
        }
      });

      await BarcodeScanner.startScan({
        formats,
        lensFacing: LensFacing.Back,
      });
    } catch (e) {
      document.querySelector('body')?.classList.remove('barcode-scanner-active');
      document.querySelector('html')?.classList.remove('barcode-scanner-active');
      throw e;
    }
  },

  async stopScan(): Promise<void> {
    try {
      await BarcodeScanner.removeAllListeners();
      await BarcodeScanner.stopScan();
    } catch (e) {
      console.error('Error stopping scan', e);
    } finally {
      document.querySelector('body')?.classList.remove('barcode-scanner-active');
      document.querySelector('html')?.classList.remove('barcode-scanner-active');
    }
  },

  async toggleTorch(enable: boolean): Promise<void> {
    try {
      if (enable) {
        await BarcodeScanner.enableTorch();
      } else {
        await BarcodeScanner.disableTorch();
      }
    } catch (e) {
      console.error('Torch toggle failed', e);
    }
  },

  async isTorchAvailable(): Promise<boolean> {
    try {
      const result = await BarcodeScanner.isTorchAvailable();
      return result.available;
    } catch {
      return false;
    }
  },

  async scanFromImage(path: string): Promise<ScanResult[]> {
    try {
      const { barcodes } = await BarcodeScanner.readBarcodesFromImage({
        path,
        formats: getFormatsForMode('All'),
      });
      return barcodes.map((b) => ({
        rawValue: b.rawValue || '',
        format: formatToString(b.format),
        cornerPoints: b.cornerPoints as { x: number; y: number }[] | undefined,
      }));
    } catch (e) {
      console.error('Image scan failed', e);
      return [];
    }
  },

  async isSupported(): Promise<boolean> {
    try {
      const result = await BarcodeScanner.isSupported();
      return result.supported;
    } catch {
      return false;
    }
  },

  async openSettings(): Promise<void> {
    try {
      await BarcodeScanner.openSettings();
    } catch (e) {
      console.error('Failed to open settings', e);
    }
  },
};
