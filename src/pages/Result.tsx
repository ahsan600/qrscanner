import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IonIcon } from '@ionic/react';
import {
  globeOutline,
  wifiOutline,
  personOutline,
  callOutline,
  chatbubbleOutline,
  mailOutline,
  locationOutline,
  calendarOutline,
  barcodeOutline,
  documentTextOutline,
  copyOutline,
  shareSocialOutline,
  star,
  starOutline,
  qrCodeOutline,
  openOutline,
  eyeOutline,
  eyeOffOutline,
  warningOutline,
  closeOutline,
  chevronDownOutline,
  chevronUpOutline,
  searchOutline,
  cartOutline,
} from 'ionicons/icons';
import { Browser } from '@capacitor/browser';
import { Clipboard } from '@capacitor/clipboard';
import { shareService } from '../services/shareService';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import QRCode from 'qrcode';
import { t } from '../utils/i18n';
import { parseContent, type ParsedContent } from '../services/parser';
import { lookupProduct, type ProductInfo } from '../services/productLookup';
import { useSettingsStore } from '../store/useSettingsStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { AppButton, IconButton, Skeleton } from '../components/ui';
import { monetizationService } from '../services/monetization';
import type { HistoryItem } from '../store/types';

interface ResultSheetProps {
  item: HistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; labelKey: string }> = {
  url: { icon: globeOutline, color: '#4D7CFF', labelKey: 'type.url' },
  wifi: { icon: wifiOutline, color: '#00E5A8', labelKey: 'type.wifi' },
  contact: { icon: personOutline, color: '#A855F7', labelKey: 'type.contact' },
  phone: { icon: callOutline, color: '#38BDF8', labelKey: 'type.phone' },
  sms: { icon: chatbubbleOutline, color: '#FB923C', labelKey: 'type.sms' },
  email: { icon: mailOutline, color: '#F43F5E', labelKey: 'type.email' },
  geo: { icon: locationOutline, color: '#10B981', labelKey: 'type.geo' },
  calendar: { icon: calendarOutline, color: '#EC4899', labelKey: 'type.calendar' },
  product: { icon: barcodeOutline, color: '#F59E0B', labelKey: 'type.product' },
  text: { icon: documentTextOutline, color: '#94A3B8', labelKey: 'type.text' },
};

const ResultSheet: React.FC<ResultSheetProps> = ({ item, isOpen, onClose }) => {
  const settings = useSettingsStore();
  const toggleFavorite = useHistoryStore((s) => s.toggleFavorite);

  const [showRaw, setShowRaw] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [autoOpenCount, setAutoOpenCount] = useState<number | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const autoOpenTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const parsed: ParsedContent = useMemo(() => {
    if (!item) return { type: 'text', text: '' };
    return parseContent(item.content, item.format);
  }, [item]);

  const openUrl = useCallback(async (url: string) => {
    try {
      await Browser.open({ url });
    } catch {
      window.open(url, '_system');
    }
  }, []);

  const handleCancelAutoOpen = useCallback(() => {
    if (autoOpenTimerRef.current) {
      clearInterval(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }
    setAutoOpenCount(null);
  }, []);

  const handleCloseWithAd = useCallback(() => {
    handleCancelAutoOpen();
    onClose();
    // Frequency check after closing result sheet
    monetizationService.recordScan().catch(() => {});
  }, [handleCancelAutoOpen, onClose]);

  // Product lookup if applicable
  useEffect(() => {
    if (!item || !isOpen) {
      setProductInfo(null);
      return;
    }

    if (parsed.type === 'product' && settings.productLookup) {
      setLoadingProduct(true);
      lookupProduct(parsed.code)
        .then((info) => setProductInfo(info))
        .catch(() => setProductInfo(null))
        .finally(() => setLoadingProduct(false));
    }
  }, [item, isOpen, parsed, settings.productLookup]);

  // Auto-open safety countdown for URLs
  useEffect(() => {
    if (autoOpenTimerRef.current) {
      clearInterval(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }

    if (!item || !isOpen || parsed.type !== 'url' || !settings.autoOpenLinks) {
      setAutoOpenCount(null);
      return;
    }

    // Never auto-open suspicious links
    if (parsed.isSuspicious) {
      setAutoOpenCount(null);
      return;
    }

    let count = 2;
    setAutoOpenCount(count);
    autoOpenTimerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (autoOpenTimerRef.current) {
          clearInterval(autoOpenTimerRef.current);
          autoOpenTimerRef.current = null;
        }
        setAutoOpenCount(null);
        openUrl(parsed.url);
      } else {
        setAutoOpenCount(count);
      }
    }, 1000);

    return () => {
      if (autoOpenTimerRef.current) {
        clearInterval(autoOpenTimerRef.current);
        autoOpenTimerRef.current = null;
      }
    };
  }, [item, isOpen, parsed, settings.autoOpenLinks, openUrl]);

  // Generate QR image on demand
  useEffect(() => {
    if (!item || !isOpen) {
      setQrImageUrl(null);
      return;
    }
    QRCode.toDataURL(item.content, { width: 300, margin: 2 })
      .then((url: string) => setQrImageUrl(url))
      .catch(() => setQrImageUrl(null));
  }, [item, isOpen]);

  const handleCopy = useCallback(async (textToCopy?: string) => {
    const text = textToCopy || item?.content || '';
    try {
      await Clipboard.write({ string: text });
      await Haptics.impact({ style: ImpactStyle.Light });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  }, [item]);

  const handleShare = useCallback(async () => {
    if (!item) return;
    try {
      await shareService.shareText({
        title: item.label,
        text: item.content,
        dialogTitle: 'Share Result',
      });
    } catch (e) {
      console.error('Share failed', e);
    }
  }, [item]);

  const handleToggleFavorite = useCallback(async () => {
    if (!item) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
    await toggleFavorite(item.id);
  }, [item, toggleFavorite]);

  const handleSaveQR = useCallback(async () => {
    if (!qrImageUrl) return;
    try {
      await shareService.shareImage({
        title: `QR_${item?.label || 'ScanPro'}`,
        dataUrl: qrImageUrl,
        text: item?.content,
        dialogTitle: 'Save / Share QR Code',
      });
    } catch (e) {
      console.error('Share QR failed', e);
    }
  }, [qrImageUrl, item]);

  if (!isOpen || !item) return null;

  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.text;
  const isFavorite = item.favorite;

  return createPortal(
    <div className="sp-sheet-backdrop" onClick={handleCloseWithAd}>
      <motion.div
        className="sp-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="sp-sheet-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${typeConfig.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IonIcon icon={typeConfig.icon} style={{ fontSize: 24, color: typeConfig.color }} />
            </div>
            <div>
              <div className="text-title" style={{ fontSize: 18, lineHeight: 1.2 }}>
                {t(typeConfig.labelKey)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span className="sp-format-badge">{item.format}</span>
                <span className="text-caption">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <IconButton icon={closeOutline} onClick={handleCloseWithAd} label="Close" size={24} />
        </div>

        {/* Safety banner for URLs */}
        {parsed.type === 'url' && (
          <div style={{ marginBottom: 16 }}>
            {parsed.isSuspicious ? (
              <div
                style={{
                  background: 'rgba(255, 84, 112, 0.12)',
                  border: '1px solid rgba(255, 84, 112, 0.3)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <IonIcon icon={warningOutline} style={{ color: 'var(--danger)', fontSize: 20, marginTop: 2 }} />
                <div>
                  <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>
                    {t('result.safetyWarning')}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {parsed.suspiciousReasons.join(', ')}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(0, 229, 168, 0.08)',
                  borderRadius: 12,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>Domain: <strong>{parsed.domain}</strong></span>
              </div>
            )}

            {/* Auto open countdown banner */}
            {autoOpenCount !== null && (
              <div
                style={{
                  marginTop: 8,
                  background: 'var(--surface-2)',
                  borderRadius: 12,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                }}
              >
                <span>Opening in {autoOpenCount}s...</span>
                <button
                  className="sp-btn sp-btn-ghost"
                  style={{ padding: '2px 8px', height: 'auto', fontSize: 12 }}
                  onClick={handleCancelAutoOpen}
                >
                  {t('result.autoOpenCancel')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Parsed content display */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: 16,
            marginBottom: 16,
            maxHeight: '38vh',
            overflowY: 'auto',
          }}
        >
          {parsed.type === 'url' && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, wordBreak: 'break-all', color: 'var(--primary-2)' }}>
                {parsed.url}
              </div>
              <div className="text-caption" style={{ marginTop: 6 }}>
                Host: {parsed.domain}
              </div>
            </div>
          )}

          {parsed.type === 'wifi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span className="text-caption">Network Name (SSID)</span>
                <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>{parsed.ssid}</div>
              </div>
              <div>
                <span className="text-caption">Security</span>
                <div style={{ fontSize: 14, marginTop: 2 }}>{parsed.security.toUpperCase()}</div>
              </div>
              {parsed.password && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="text-caption">Password</span>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                    >
                      <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--surface-2)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      marginTop: 4,
                      fontSize: 14,
                      wordBreak: 'break-all',
                    }}
                  >
                    {showPassword ? parsed.password : '••••••••••••'}
                  </div>
                </div>
              )}
            </div>
          )}

          {parsed.type === 'contact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parsed.name && <div style={{ fontSize: 18, fontWeight: 600 }}>{parsed.name}</div>}
              {parsed.org && <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{parsed.org}</div>}
              {parsed.phone && (
                <div style={{ fontSize: 15, marginTop: 4 }}>
                  <span className="text-caption">Phone: </span>
                  <strong>{parsed.phone}</strong>
                </div>
              )}
              {parsed.email && (
                <div style={{ fontSize: 15 }}>
                  <span className="text-caption">Email: </span>
                  {parsed.email}
                </div>
              )}
              {parsed.address && (
                <div style={{ fontSize: 14 }}>
                  <span className="text-caption">Address: </span>
                  {parsed.address}
                </div>
              )}
              {parsed.website && (
                <div style={{ fontSize: 14, color: 'var(--primary-2)' }}>
                  <span className="text-caption">Website: </span>
                  {parsed.website}
                </div>
              )}
            </div>
          )}

          {parsed.type === 'phone' && (
            <div>
              <span className="text-caption">Phone Number</span>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{parsed.number}</div>
            </div>
          )}

          {parsed.type === 'sms' && (
            <div>
              <span className="text-caption">Recipient: {parsed.number}</span>
              <div style={{ fontSize: 15, marginTop: 8, whiteSpace: 'pre-wrap' }}>{parsed.body}</div>
            </div>
          )}

          {parsed.type === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><span className="text-caption">To:</span> <strong>{parsed.to}</strong></div>
              {parsed.subject && <div><span className="text-caption">Subject:</span> {parsed.subject}</div>}
              {parsed.body && <div style={{ fontSize: 14, marginTop: 6, whiteSpace: 'pre-wrap' }}>{parsed.body}</div>}
            </div>
          )}

          {parsed.type === 'geo' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {parsed.latitude.toFixed(5)}, {parsed.longitude.toFixed(5)}
              </div>
              {parsed.query && <div className="text-caption" style={{ marginTop: 4 }}>Query: {parsed.query}</div>}
            </div>
          )}

          {parsed.type === 'calendar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{parsed.title}</div>
              {parsed.location && <div className="text-caption">📍 {parsed.location}</div>}
              {parsed.start && <div className="text-caption">Starts: {parsed.start}</div>}
              {parsed.end && <div className="text-caption">Ends: {parsed.end}</div>}
              {parsed.description && <div style={{ fontSize: 14, marginTop: 4 }}>{parsed.description}</div>}
            </div>
          )}

          {parsed.type === 'product' && (
            <div>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {parsed.code}
              </div>
              {loadingProduct && (
                <div style={{ marginTop: 12 }}>
                  <Skeleton width="60%" height={16} />
                  <div style={{ height: 8 }} />
                  <Skeleton width="40%" height={14} />
                </div>
              )}
              {!loadingProduct && productInfo && productInfo.found && (
                <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
                  {productInfo.image && (
                    <img
                      src={productInfo.image}
                      alt={productInfo.name}
                      style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#fff' }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{productInfo.name}</div>
                    {productInfo.brand && <div className="text-caption">{productInfo.brand}</div>}
                    {productInfo.quantity && <div className="text-caption">{productInfo.quantity}</div>}
                  </div>
                </div>
              )}
              {!loadingProduct && (!productInfo || !productInfo.found) && (
                <div className="text-caption" style={{ marginTop: 8 }}>
                  {t('result.noProductInfo')}
                </div>
              )}
            </div>
          )}

          {parsed.type === 'text' && (
            <div style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {parsed.text}
            </div>
          )}
        </div>

        {/* Collapsible raw data */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowRaw(!showRaw)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 0',
            }}
          >
            <span>{t('result.rawData')}</span>
            <IonIcon icon={showRaw ? chevronUpOutline : chevronDownOutline} />
          </button>
          {showRaw && (
            <pre
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 10,
                marginTop: 6,
                maxHeight: 120,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                color: 'var(--text-muted)',
                userSelect: 'text',
              }}
            >
              {item.content}
            </pre>
          )}
        </div>

        {/* Primary Action Button */}
        <div style={{ marginBottom: 12 }}>
          {parsed.type === 'url' && (
            <AppButton
              variant="primary"
              fullWidth
              icon={openOutline}
              onClick={() => openUrl(parsed.url)}
            >
              {t('result.openBrowser')}
            </AppButton>
          )}

          {parsed.type === 'wifi' && (
            <AppButton
              variant="primary"
              fullWidth
              icon={copyOutline}
              onClick={() => handleCopy(parsed.password)}
            >
              {t('result.copyPassword')}
            </AppButton>
          )}

          {parsed.type === 'contact' && (
            <AppButton
              variant="primary"
              fullWidth
              icon={personOutline}
              onClick={() => handleCopy(item.content)}
            >
              {t('result.copy')}
            </AppButton>
          )}

          {parsed.type === 'phone' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <AppButton
                variant="primary"
                fullWidth
                icon={callOutline}
                onClick={() => window.open(`tel:${parsed.number}`, '_system')}
              >
                {t('result.call')}
              </AppButton>
              <AppButton
                variant="secondary"
                fullWidth
                icon={chatbubbleOutline}
                onClick={() => window.open(`sms:${parsed.number}`, '_system')}
              >
                {t('result.message')}
              </AppButton>
            </div>
          )}

          {parsed.type === 'sms' && (
            <AppButton
              variant="primary"
              fullWidth
              icon={chatbubbleOutline}
              onClick={() => window.open(`sms:${parsed.number}?body=${encodeURIComponent(parsed.body)}`, '_system')}
            >
              {t('result.message')}
            </AppButton>
          )}

          {parsed.type === 'email' && (
            <AppButton
              variant="primary"
              fullWidth
              icon={mailOutline}
              onClick={() =>
                window.open(
                  `mailto:${parsed.to}?subject=${encodeURIComponent(parsed.subject)}&body=${encodeURIComponent(parsed.body)}`,
                  '_system'
                )
              }
            >
              {t('result.sendEmail')}
            </AppButton>
          )}

          {parsed.type === 'geo' && (
            <AppButton
              variant="primary"
              fullWidth
              icon={locationOutline}
              onClick={() =>
                openUrl(`https://www.google.com/maps/search/?api=1&query=${parsed.latitude},${parsed.longitude}`)
              }
            >
              {t('result.openMaps')}
            </AppButton>
          )}

          {parsed.type === 'calendar' && (
            <AppButton
              variant="primary"
              fullWidth
              icon={calendarOutline}
              onClick={() => handleCopy(item.content)}
            >
              {t('result.copy')}
            </AppButton>
          )}

          {parsed.type === 'product' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <AppButton
                variant="primary"
                fullWidth
                icon={searchOutline}
                onClick={() => openUrl(`https://www.google.com/search?q=${encodeURIComponent(parsed.code)}`)}
              >
                {t('result.searchGoogle')}
              </AppButton>
              <AppButton
                variant="secondary"
                fullWidth
                icon={cartOutline}
                onClick={() => openUrl(`https://www.amazon.com/s?k=${encodeURIComponent(parsed.code)}`)}
              >
                Amazon
              </AppButton>
            </div>
          )}

          {parsed.type === 'text' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <AppButton
                variant="primary"
                fullWidth
                icon={searchOutline}
                onClick={() => openUrl(`https://www.google.com/search?q=${encodeURIComponent(parsed.text)}`)}
              >
                {t('result.searchWeb')}
              </AppButton>
              <AppButton
                variant="secondary"
                fullWidth
                icon={copyOutline}
                onClick={() => handleCopy()}
              >
                {copied ? t('result.copied') : t('result.copy')}
              </AppButton>
            </div>
          )}
        </div>

        {/* Secondary Actions Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '12px 0 4px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <IconButton
            icon={copyOutline}
            onClick={() => handleCopy()}
            label={copied ? t('result.copied') : t('result.copy')}
            color={copied ? 'var(--primary)' : undefined}
          />
          <IconButton
            icon={shareSocialOutline}
            onClick={handleShare}
            label={t('result.share')}
          />
          <IconButton
            icon={isFavorite ? star : starOutline}
            onClick={handleToggleFavorite}
            label={t('result.favorite')}
            color={isFavorite ? 'var(--warning)' : undefined}
          />
          <IconButton
            icon={qrCodeOutline}
            onClick={handleSaveQR}
            label={t('result.saveQR')}
          />
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default ResultSheet;
