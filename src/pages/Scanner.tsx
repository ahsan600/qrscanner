import React, { useEffect, useCallback, useRef, useState } from 'react';
import { IonPage, IonContent, IonIcon, useIonViewDidEnter, useIonViewWillLeave } from '@ionic/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  flashOutline,
  flashOffOutline,
  imagesOutline,
  lockClosedOutline,
  alertCircleOutline,
  reloadOutline,
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App as CapApp } from '@capacitor/app';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { t } from '../utils/i18n';
import { useScannerStore } from '../store/useScannerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { scannerService, type ScanResult } from '../services/scanner';
import { parseContent, getSmartLabel } from '../services/parser';
import { generateId } from '../utils/helpers';
import { playScanBeep } from '../utils/audio';
import { GlassPanel, Chip, AppButton, Skeleton, Toast } from '../components/ui';
import type { HistoryItem } from '../store/types';
import ResultSheet from './Result';

const Scanner: React.FC = () => {
  const {
    isScanning, isTorchOn, scanMode, isBatchMode, batchCount,
    isPermissionGranted, isPermissionDeniedPermanently,
    cameraError, isLoading,
    setIsScanning, setTorch, setScanMode, setBatchMode,
    incrementBatchCount, resetBatchCount,
    setPermission, setCameraError, setLoading,
  } = useScannerStore();

  const settings = useSettingsStore();
  const addItem = useHistoryStore((s) => s.addItem);

  const [resultItem, setResultItem] = useState<HistoryItem | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [batchToast, setBatchToast] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(true);
  const lastScanTime = useRef<number>(0);
  const lastScanValue = useRef<string>('');
  const batchToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScanResult = useCallback(async (result: ScanResult) => {
    const now = Date.now();
    const cooldown = settings.duplicateCooldown;

    // Duplicate protection
    if (
      cooldown > 0 &&
      result.rawValue === lastScanValue.current &&
      now - lastScanTime.current < cooldown
    ) {
      return;
    }

    lastScanValue.current = result.rawValue;
    lastScanTime.current = now;

    // Haptic feedback
    if (settings.vibrateOnScan) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    }

    // Audio feedback
    if (settings.beepOnScan) {
      playScanBeep();
    }

    // Parse the content
    const parsed = parseContent(result.rawValue, result.format);
    const label = getSmartLabel(parsed, result.rawValue);

    // Create history item
    const item: HistoryItem = {
      id: generateId(),
      type: parsed.type,
      format: result.format,
      content: result.rawValue,
      label,
      source: 'scanned',
      favorite: false,
      timestamp: now,
    };

    // Save to history
    if (settings.saveHistory) {
      await addItem(item);
    }

    if (isBatchMode) {
      incrementBatchCount();
      // Show batch toast
      if (batchToastTimer.current) clearTimeout(batchToastTimer.current);
      setBatchToast(`${t('scanner.added')}: ${label.substring(0, 30)}`);
      batchToastTimer.current = setTimeout(() => setBatchToast(null), 2000);
    } else {
      // Pause scanning and show result
      await scannerService.stopScan();
      setIsScanning(false);
      setResultItem(item);
      setShowResult(true);
    }
  }, [settings, isBatchMode, addItem, incrementBatchCount, setIsScanning]);

  const startScanning = useCallback(async () => {
    try {
      setCameraError(null);
      const mode = settings.defaultScanMode || scanMode;
      await scannerService.startScan(mode, handleScanResult);
      setIsScanning(true);

      if (settings.defaultTorchOn) {
        const canTorch = await scannerService.isTorchAvailable();
        if (canTorch) {
          await scannerService.toggleTorch(true);
          setTorch(true);
        }
      }
    } catch (e) {
      console.error('Failed to start scan', e);
      setCameraError(String(e));
    }
  }, [scanMode, settings.defaultScanMode, settings.defaultTorchOn, handleScanResult, setIsScanning, setTorch, setCameraError]);

  const checkAndStartScanner = useCallback(async () => {
    setLoading(true);
    try {
      const perm = await scannerService.checkPermission();
      setPermission(perm.granted, perm.deniedPermanently);

      if (perm.granted) {
        const available = await scannerService.isTorchAvailable();
        setTorchAvailable(available);

        if (settings.defaultScanMode) {
          setScanMode(settings.defaultScanMode);
        }
        if (settings.batchDefault) {
          setBatchMode(true);
        }

        await startScanning();
      }
    } catch (e) {
      setCameraError(String(e));
    } finally {
      setLoading(false);
    }
  }, [setLoading, setPermission, setTorchAvailable, settings.defaultScanMode, settings.batchDefault, setScanMode, setBatchMode, startScanning, setCameraError]);

  // Sync settings whenever scanner tab enters view
  useIonViewDidEnter(() => {
    if (settings.batchDefault) {
      setBatchMode(true);
    }
    if (settings.defaultScanMode && scanMode !== settings.defaultScanMode) {
      setScanMode(settings.defaultScanMode);
    }
    if (settings.defaultTorchOn && isPermissionGranted && !isTorchOn) {
      scannerService.isTorchAvailable().then((avail) => {
        if (avail) {
          scannerService.toggleTorch(true).then(() => setTorch(true)).catch(() => {});
        }
      });
    }
  });

  useIonViewWillLeave(() => {
    if (isTorchOn) {
      scannerService.toggleTorch(false).catch(() => {});
      setTorch(false);
    }
  });

  // Check permission on mount
  useEffect(() => {
    checkAndStartScanner();
    return () => {
      scannerService.stopScan();
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const listener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && isScanning) {
        scannerService.stopScan();
        setIsScanning(false);
      } else if (isActive && isPermissionGranted && !showResult) {
        startScanning();
      }
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, [isScanning, isPermissionGranted, showResult, startScanning, setIsScanning]);

  const handleCloseResult = useCallback(async () => {
    setShowResult(false);
    setResultItem(null);
    // Resume scanning
    await startScanning();
  }, [startScanning]);

  const handleRequestPermission = useCallback(async () => {
    const result = await scannerService.requestPermission();
    setPermission(result.granted, result.deniedPermanently);
    if (result.granted) {
      await startScanning();
    }
  }, [startScanning]);

  const handleToggleTorch = useCallback(async () => {
    const newState = !isTorchOn;
    await scannerService.toggleTorch(newState);
    setTorch(newState);
  }, [isTorchOn]);

  const handleModeChange = useCallback(async (mode: typeof scanMode) => {
    setScanMode(mode);
    if (isScanning) {
      await scannerService.stopScan();
      setIsScanning(false);
      // Restart with new mode
      try {
        await scannerService.startScan(mode, handleScanResult);
        setIsScanning(true);
      } catch (e) {
        setCameraError(String(e));
      }
    }
  }, [isScanning, handleScanResult]);

  const handleGalleryImport = useCallback(async () => {
    try {
      const result = await FilePicker.pickImages({ limit: 1 });
      if (result.files.length > 0) {
        const file = result.files[0];
        const path = file.path || file.blob?.toString() || '';
        if (path) {
          const codes = await scannerService.scanFromImage(path);
          if (codes.length > 0) {
            handleScanResult(codes[0]);
          } else {
            setBatchToast(t('scanner.noCodeInImage'));
            if (batchToastTimer.current) clearTimeout(batchToastTimer.current);
            batchToastTimer.current = setTimeout(() => setBatchToast(null), 3000);
          }
        }
      }
    } catch (e) {
      console.error('Gallery import failed', e);
    }
  }, [handleScanResult]);


  const isQRMode = scanMode === 'QR';

  // Permission denied state
  if (!isLoading && !isPermissionGranted) {
    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ '--background': 'var(--bg)', '--color': 'var(--text)' } as React.CSSProperties}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            padding: '0 24px',
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <IonIcon icon={lockClosedOutline} style={{ fontSize: 36, color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-title" style={{ marginBottom: 8, color: 'var(--text)' }}>
              Camera Access Required
            </h3>
            <p className="text-body" style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              {t('scanner.permissionDenied')}
            </p>
            {isPermissionDeniedPermanently ? (
              <AppButton variant="primary" onClick={() => scannerService.openSettings()}>
                {t('scanner.openSettings')}
              </AppButton>
            ) : (
              <AppButton variant="primary" onClick={handleRequestPermission}>
                {t('scanner.grantPermission')}
              </AppButton>
            )}
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Camera error state
  if (cameraError && !isLoading) {
    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ '--background': 'var(--bg)', '--color': 'var(--text)' } as React.CSSProperties}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            padding: '0 24px',
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'rgba(239,68,68,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <IonIcon icon={alertCircleOutline} style={{ fontSize: 36, color: 'var(--danger)' }} />
            </div>
            <h3 className="text-title" style={{ marginBottom: 8, color: 'var(--text)' }}>
              {t('scanner.cameraError')}
            </h3>
            <p className="text-body" style={{ color: 'var(--text-muted)', marginBottom: 24, maxWidth: 300 }}>
              Camera is busy or not accessible. Make sure permissions are granted.
            </p>
            <AppButton variant="primary" onClick={checkAndStartScanner} icon={reloadOutline}>
              {t('scanner.retry')}
            </AppButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent style={{ '--background': 'transparent' } as React.CSSProperties} scrollY={false}>
        {/* Loading state */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <Skeleton width={200} height={200} borderRadius={24} />
              <p className="text-caption" style={{ marginTop: 16 }}>
                {t('scanner.loading')}
              </p>
            </div>
          </div>
        )}

        {/* Scanner overlay */}
        {isScanning && (
          <div className="scanner-overlay">
            {/* Vignette */}
            <div className="scanner-vignette" />

            {/* Top bar */}
            <div className="scanner-top-bar">
              {/* Flash toggle */}
              {torchAvailable && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="sp-btn-icon"
                  onClick={handleToggleTorch}
                  style={{
                    background: isTorchOn
                      ? 'rgba(0,229,168,0.2)'
                      : 'rgba(20,26,43,0.7)',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${isTorchOn ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                  aria-label={t('scanner.flash')}
                >
                  <IonIcon
                    icon={isTorchOn ? flashOutline : flashOffOutline}
                    style={{
                      fontSize: 22,
                      color: isTorchOn ? 'var(--primary)' : 'var(--text-muted)',
                    }}
                  />
                </motion.button>
              )}

              {/* Mode switcher */}
              <div className="scanner-mode-switcher">
                {(['All', 'QR', 'Barcode'] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`scanner-mode-btn ${scanMode === mode ? 'active' : ''}`}
                    onClick={() => handleModeChange(mode)}
                  >
                    {t(`scanner.mode${mode}`)}
                  </button>
                ))}
              </div>

              {/* Gallery */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="sp-btn-icon"
                onClick={handleGalleryImport}
                style={{
                  background: 'rgba(20,26,43,0.7)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--border)',
                }}
                aria-label={t('scanner.gallery')}
              >
                <IonIcon
                  icon={imagesOutline}
                  style={{ fontSize: 22, color: 'var(--text-muted)' }}
                />
              </motion.button>
            </div>

            {/* Scan frame */}
            <div
              className={`scanner-cutout ${isQRMode || scanMode === 'All' ? 'scanner-cutout-qr' : 'scanner-cutout-barcode'}`}
            >
              <div className="scanner-corner scanner-corner-tl" />
              <div className="scanner-corner scanner-corner-tr" />
              <div className="scanner-corner scanner-corner-bl" />
              <div className="scanner-corner scanner-corner-br" />
              <div className="scanner-laser" />
              <div className="scanner-hint">{t('scanner.hint')}</div>
            </div>

            {/* Bottom controls */}
            <div className="scanner-bottom-controls">
              {/* Batch mode */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Chip
                  label={t('scanner.batch')}
                  active={isBatchMode}
                  onClick={() => setBatchMode(!isBatchMode)}
                />
                {isBatchMode && batchCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="sp-chip active"
                  >
                    {t('scanner.scanned')}: {batchCount}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Batch toast */}
        <Toast
          message={batchToast || ''}
          visible={Boolean(batchToast)}
          type={batchToast?.includes('No') || batchToast?.includes('no') ? 'error' : 'success'}
        />

        {/* Result sheet */}
        <AnimatePresence>
          {showResult && resultItem && (
            <ResultSheet
              item={resultItem}
              isOpen={showResult}
              onClose={handleCloseResult}
            />
          )}
        </AnimatePresence>
      </IonContent>
    </IonPage>
  );
};

export default Scanner;
