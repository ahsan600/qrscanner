import { create } from 'zustand';
import type { ScanMode } from '../utils/constants';

interface ScannerState {
  isScanning: boolean;
  isTorchOn: boolean;
  scanMode: ScanMode;
  isBatchMode: boolean;
  batchCount: number;
  zoomLevel: number;
  isPermissionGranted: boolean;
  isPermissionDeniedPermanently: boolean;
  cameraError: string | null;
  isLoading: boolean;

  setIsScanning: (v: boolean) => void;
  setTorch: (v: boolean) => void;
  setScanMode: (v: ScanMode) => void;
  setBatchMode: (v: boolean) => void;
  incrementBatchCount: () => void;
  resetBatchCount: () => void;
  setZoomLevel: (v: number) => void;
  setPermission: (granted: boolean, deniedPermanently?: boolean) => void;
  setCameraError: (e: string | null) => void;
  setLoading: (v: boolean) => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  isScanning: false,
  isTorchOn: false,
  scanMode: 'All',
  isBatchMode: false,
  batchCount: 0,
  zoomLevel: 1,
  isPermissionGranted: false,
  isPermissionDeniedPermanently: false,
  cameraError: null,
  isLoading: true,

  setIsScanning: (v) => set({ isScanning: v }),
  setTorch: (v) => set({ isTorchOn: v }),
  setScanMode: (v) => set({ scanMode: v }),
  setBatchMode: (v) => set({ isBatchMode: v, batchCount: 0 }),
  incrementBatchCount: () => set((s) => ({ batchCount: s.batchCount + 1 })),
  resetBatchCount: () => set({ batchCount: 0 }),
  setZoomLevel: (v) => set({ zoomLevel: v }),
  setPermission: (granted, deniedPermanently = false) =>
    set({ isPermissionGranted: granted, isPermissionDeniedPermanently: deniedPermanently }),
  setCameraError: (e) => set({ cameraError: e }),
  setLoading: (v) => set({ isLoading: v }),
}));
