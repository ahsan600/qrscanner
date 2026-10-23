import React, { useState, useRef, useCallback, useEffect } from 'react';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import { motion, AnimatePresence } from 'framer-motion';
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
  arrowBackOutline,
  copyOutline,
  shareSocialOutline,
  downloadOutline,
  checkmarkOutline,
  eyeOutline,
  eyeOffOutline,
  colorPaletteOutline,
  navigateOutline,
} from 'ionicons/icons';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { shareService } from '../services/shareService';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { t } from '../utils/i18n';
import { AppButton, IconButton, Toast } from '../components/ui';
import { monetizationService } from '../services/monetization';
import { useHistoryStore } from '../store/useHistoryStore';
import {
  generateId,
  isNative,
  truncate,
  calculateEan13Checksum,
  calculateEan8Checksum,
  calculateUpcChecksum,
} from '../utils/helpers';
import type { HistoryItem } from '../store/types';

export type GeneratorType =
  | 'text'
  | 'url'
  | 'wifi'
  | 'contact'
  | 'phone'
  | 'sms'
  | 'email'
  | 'geo'
  | 'calendar'
  | 'barcode';

export type BarcodeStandard = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF';

interface TypeOption {
  type: GeneratorType;
  title: string;
  icon: string;
  color: string;
  description: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { type: 'text', title: 'Plain Text', icon: documentTextOutline, color: '#94A3B8', description: 'Any message or notes' },
  { type: 'url', title: 'Website URL', icon: globeOutline, color: '#4D7CFF', description: 'Link to a webpage' },
  { type: 'wifi', title: 'Wi-Fi Network', icon: wifiOutline, color: '#00E5A8', description: 'Connect without typing password' },
  { type: 'contact', title: 'Contact Card', icon: personOutline, color: '#A855F7', description: 'vCard with phone & email' },
  { type: 'phone', title: 'Phone Number', icon: callOutline, color: '#38BDF8', description: 'Direct dial number' },
  { type: 'sms', title: 'SMS Message', icon: chatbubbleOutline, color: '#FB923C', description: 'Pre-filled text message' },
  { type: 'email', title: 'Email Address', icon: mailOutline, color: '#F43F5E', description: 'Email with subject and body' },
  { type: 'geo', title: 'Location Coordinates', icon: locationOutline, color: '#10B981', description: 'Map coordinates' },
  { type: 'calendar', title: 'Calendar Event', icon: calendarOutline, color: '#EC4899', description: 'Event title, time & location' },
  { type: 'barcode', title: 'Product Barcode', icon: barcodeOutline, color: '#F59E0B', description: 'EAN, UPC, Code 128...' },
];

const Generator: React.FC = () => {
  const addItem = useHistoryStore((s) => s.addItem);

  // Flow step: 1 = choose type, 2 = fill form, 3 = preview
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<GeneratorType>('text');

  // Form Fields
  const [textContent, setTextContent] = useState('');
  const [urlContent, setUrlContent] = useState('https://');

  // Wi-Fi
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSecurity, setWifiSecurity] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [wifiHidden, setWifiHidden] = useState(false);
  const [showWifiPass, setShowWifiPass] = useState(false);

  // Contact
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactOrg, setContactOrg] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactUrl, setContactUrl] = useState('');

  // Phone / SMS / Email
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsNumber, setSmsNumber] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Location / Calendar
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  // Barcode
  const [barcodeStandard, setBarcodeStandard] = useState<BarcodeStandard>('CODE128');
  const [barcodeValue, setBarcodeValue] = useState('');

  // Preview & Customization State
  const [generatedPayload, setGeneratedPayload] = useState('');
  const [generatedFormat, setGeneratedFormat] = useState('QR_CODE');
  const [generatedLabel, setGeneratedLabel] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // QR Customizations
  const [qrColorDark, setQrColorDark] = useState('#000000');
  const [qrColorLight, setQrColorLight] = useState('#ffffff');
  const [qrEcc, setQrEcc] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [qrMargin, setQrMargin] = useState(2);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // GPS Auto-detect
  const handleGetCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted') {
          const req = await Geolocation.requestPermissions({ permissions: ['location'] });
          if (req.location !== 'granted') {
            setLoadingLocation(false);
            showToast('Location permission denied');
            return;
          }
        }
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      });

      setGeoLat(pos.coords.latitude.toFixed(6));
      setGeoLng(pos.coords.longitude.toFixed(6));
      setLoadingLocation(false);
      showToast('Current GPS coordinates acquired');
    } catch (err) {
      console.warn('Capacitor Geolocation error, trying fallback:', err);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGeoLat(pos.coords.latitude.toFixed(6));
            setGeoLng(pos.coords.longitude.toFixed(6));
            setLoadingLocation(false);
            showToast('Current GPS coordinates acquired');
          },
          (browserErr) => {
            console.warn('Fallback geolocation error:', browserErr);
            setLoadingLocation(false);
            showToast('Could not acquire GPS position. Check location settings.');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setLoadingLocation(false);
        showToast('Could not acquire GPS position. Check location settings.');
      }
    }
  };

  // Validation
  const isValid = useCallback((): boolean => {
    switch (selectedType) {
      case 'text':
        return textContent.trim().length > 0;
      case 'url': {
        const u = urlContent.trim();
        return u.length > 3 && !/\s/.test(u);
      }
      case 'wifi':
        return wifiSsid.trim().length > 0;
      case 'contact':
        return contactName.trim().length > 0;
      case 'phone':
        return phoneNumber.trim().length > 0;
      case 'sms':
        return smsNumber.trim().length > 0;
      case 'email':
        return emailTo.trim().length > 0 && emailTo.includes('@');
      case 'geo':
        return !isNaN(parseFloat(geoLat)) && !isNaN(parseFloat(geoLng));
      case 'calendar':
        return eventTitle.trim().length > 0;
      case 'barcode': {
        const v = barcodeValue.trim();
        if (!v) return false;
        if (barcodeStandard === 'EAN13') return /^\d{12,13}$/.test(v);
        if (barcodeStandard === 'EAN8') return /^\d{7,8}$/.test(v);
        if (barcodeStandard === 'UPC') return /^\d{11,12}$/.test(v);
        if (barcodeStandard === 'ITF') return /^\d+$/.test(v) && v.length % 2 === 0;
        if (barcodeStandard === 'CODE39') return /^[A-Z0-9 \-.$/+%]*$/i.test(v);
        return v.length > 0;
      }
      default:
        return false;
    }
  }, [
    selectedType,
    textContent,
    urlContent,
    wifiSsid,
    contactName,
    phoneNumber,
    smsNumber,
    emailTo,
    geoLat,
    geoLng,
    eventTitle,
    barcodeStandard,
    barcodeValue,
  ]);

  // Build Payload
  const buildPayload = useCallback((): { payload: string; label: string; format: string } => {
    switch (selectedType) {
      case 'text':
        return {
          payload: textContent.trim(),
          label: truncate(textContent.trim(), 28),
          format: 'QR_CODE',
        };

      case 'url': {
        let u = urlContent.trim();
        if (!/^https?:\/\//i.test(u)) {
          u = `https://${u}`;
        }
        try {
          const parsed = new URL(u);
          return { payload: u, label: parsed.hostname || u, format: 'QR_CODE' };
        } catch {
          return { payload: u, label: u, format: 'QR_CODE' };
        }
      }

      case 'wifi': {
        const p = wifiSecurity !== 'nopass' && wifiPassword ? `P:${wifiPassword};` : '';
        const h = wifiHidden ? 'H:true;' : '';
        const payload = `WIFI:T:${wifiSecurity};S:${wifiSsid};${p}${h};`;
        return { payload, label: `Wi-Fi: ${wifiSsid}`, format: 'QR_CODE' };
      }

      case 'contact': {
        const vcard = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${contactName.trim()}`,
          contactTitle.trim() ? `TITLE:${contactTitle.trim()}` : '',
          contactOrg.trim() ? `ORG:${contactOrg.trim()}` : '',
          contactPhone.trim() ? `TEL:${contactPhone.trim()}` : '',
          contactEmail.trim() ? `EMAIL:${contactEmail.trim()}` : '',
          contactAddress.trim() ? `ADR:;;${contactAddress.trim()};;;;` : '',
          contactUrl.trim() ? `URL:${contactUrl.trim()}` : '',
          'END:VCARD',
        ]
          .filter(Boolean)
          .join('\n');
        return { payload: vcard, label: contactName.trim(), format: 'QR_CODE' };
      }

      case 'phone': {
        const cleaned = phoneNumber.trim().replace(/\s+/g, '');
        return { payload: `tel:${cleaned}`, label: phoneNumber.trim(), format: 'QR_CODE' };
      }

      case 'sms': {
        const cleaned = smsNumber.trim().replace(/\s+/g, '');
        return {
          payload: `smsto:${cleaned}:${smsBody.trim()}`,
          label: `SMS: ${smsNumber.trim()}`,
          format: 'QR_CODE',
        };
      }

      case 'email': {
        const params = new URLSearchParams();
        if (emailSubject.trim()) params.set('subject', emailSubject.trim());
        if (emailBody.trim()) params.set('body', emailBody.trim());
        const q = params.toString() ? `?${params.toString()}` : '';
        return {
          payload: `mailto:${emailTo.trim()}${q}`,
          label: emailTo.trim(),
          format: 'QR_CODE',
        };
      }

      case 'geo': {
        const lat = parseFloat(geoLat).toFixed(6);
        const lng = parseFloat(geoLng).toFixed(6);
        return {
          payload: `geo:${lat},${lng}`,
          label: `${lat}, ${lng}`,
          format: 'QR_CODE',
        };
      }

      case 'calendar': {
        const formatCalDate = (dStr: string) => {
          if (!dStr) return '';
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return '';
          return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const vevent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'BEGIN:VEVENT',
          `SUMMARY:${eventTitle.trim()}`,
          eventLocation.trim() ? `LOCATION:${eventLocation.trim()}` : '',
          eventStart ? `DTSTART:${formatCalDate(eventStart)}` : '',
          eventEnd ? `DTEND:${formatCalDate(eventEnd)}` : '',
          eventDesc.trim() ? `DESCRIPTION:${eventDesc.trim()}` : '',
          'END:VEVENT',
          'END:VCALENDAR',
        ]
          .filter(Boolean)
          .join('\n');
        return { payload: vevent, label: eventTitle.trim(), format: 'QR_CODE' };
      }

      case 'barcode': {
        let val = barcodeValue.trim();
        if (barcodeStandard === 'EAN13') {
          const digits = val.replace(/\D/g, '');
          if (digits.length === 12) {
            val = digits + calculateEan13Checksum(digits);
          } else if (digits.length === 13) {
            const expectedCheck = calculateEan13Checksum(digits.substring(0, 12));
            val = digits.substring(0, 12) + expectedCheck;
          }
        } else if (barcodeStandard === 'EAN8') {
          const digits = val.replace(/\D/g, '');
          if (digits.length === 7) {
            val = digits + calculateEan8Checksum(digits);
          } else if (digits.length === 8) {
            const expectedCheck = calculateEan8Checksum(digits.substring(0, 7));
            val = digits.substring(0, 7) + expectedCheck;
          }
        } else if (barcodeStandard === 'UPC') {
          const digits = val.replace(/\D/g, '');
          if (digits.length === 11) {
            val = digits + calculateUpcChecksum(digits);
          } else if (digits.length === 12) {
            const expectedCheck = calculateUpcChecksum(digits.substring(0, 11));
            val = digits.substring(0, 11) + expectedCheck;
          }
        } else if (barcodeStandard === 'CODE39') {
          val = val.toUpperCase();
        }
        return {
          payload: val,
          label: `${barcodeStandard}: ${val}`,
          format: barcodeStandard,
        };
      }

      default:
        return { payload: '', label: '', format: 'QR_CODE' };
    }
  }, [
    selectedType,
    textContent,
    urlContent,
    wifiSsid,
    wifiPassword,
    wifiSecurity,
    wifiHidden,
    contactName,
    contactTitle,
    contactOrg,
    contactPhone,
    contactEmail,
    contactAddress,
    contactUrl,
    phoneNumber,
    smsNumber,
    smsBody,
    emailTo,
    emailSubject,
    emailBody,
    geoLat,
    geoLng,
    eventTitle,
    eventLocation,
    eventStart,
    eventEnd,
    eventDesc,
    barcodeStandard,
    barcodeValue,
  ]);

  // Render preview code
  const renderCode = useCallback(async () => {
    if (!generatedPayload) return;

    if (generatedFormat === 'QR_CODE') {
      try {
        const url = await QRCode.toDataURL(generatedPayload, {
          width: 320,
          margin: qrMargin,
          errorCorrectionLevel: qrEcc,
          color: {
            dark: qrColorDark,
            light: qrColorLight,
          },
        });
        setPreviewDataUrl(url);
      } catch (e) {
        console.error('QR render error', e);
      }
    } else {
      // Linear barcode with JsBarcode
      try {
        const canvas = document.createElement('canvas');
        const standardFormat = generatedFormat === 'UPC' ? 'UPC' : generatedFormat;
        JsBarcode(canvas, generatedPayload, {
          format: standardFormat as never,
          lineColor: qrColorDark,
          background: qrColorLight,
          width: 2.2,
          height: 110,
          displayValue: true,
          font: 'monospace',
          fontSize: 16,
          textMargin: 8,
        });
        setPreviewDataUrl(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error('Barcode render error', e);
      }
    }
  }, [generatedPayload, generatedFormat, qrMargin, qrEcc, qrColorDark, qrColorLight]);

  // Re-render when customizations change in Step 3
  useEffect(() => {
    if (step === 3) {
      renderCode();
    }
  }, [step, renderCode]);

  const handleGenerate = async () => {
    const { payload, label, format } = buildPayload();
    setGeneratedPayload(payload);
    setGeneratedLabel(label);
    setGeneratedFormat(format);
    setStep(3);
    await Haptics.impact({ style: ImpactStyle.Medium });

    // Save to history with source = 'created'
    const item: HistoryItem = {
      id: generateId(),
      type: selectedType,
      format,
      content: payload,
      label,
      source: 'created',
      favorite: false,
      timestamp: Date.now(),
    };
    await addItem(item);
  };

  const handleCopyContent = async () => {
    try {
      await Clipboard.write({ string: generatedPayload });
      await Haptics.impact({ style: ImpactStyle.Light });
      setCopied(true);
      showToast('Payload copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const handleShareImage = async () => {
    if (!previewDataUrl) return;
    try {
      const result = await shareService.shareImage({
        title: generatedLabel,
        dataUrl: previewDataUrl,
        text: generatedPayload,
        dialogTitle: 'Share Code Image',
      });
      if (result.method === 'download') {
        showToast('Image downloaded & ready to share');
      }
      monetizationService.recordAction('generate').catch(() => {});
    } catch (e) {
      console.error('Share failed', e);
      showToast('Could not share image');
    }
  };

  const handleDownloadImage = async () => {
    if (!previewDataUrl) return;
    const cleanName = generatedLabel.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 24);
    const fileName = `ScanPro_${selectedType}_${cleanName || Date.now()}.png`;

    try {
      if (isNative()) {
        const base64Data = previewDataUrl.replace(/^data:image\/png;base64,/, '');
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        await Haptics.impact({ style: ImpactStyle.Medium });
        showToast('Saved to Documents folder');
      } else {
        const a = document.createElement('a');
        a.href = previewDataUrl;
        a.download = fileName;
        a.click();
        showToast('Code image downloaded');
      }
      monetizationService.recordAction('generate').catch(() => {});
    } catch (err) {
      console.warn('Filesystem save error, falling back to browser download', err);
      const a = document.createElement('a');
      a.href = previewDataUrl;
      a.download = fileName;
      a.click();
      showToast('Code image downloaded');
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
        <div style={{ padding: 'calc(var(--safe-area-top) + var(--top-banner-height) + 16px) 16px calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 40px)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            {step > 1 && (
              <IconButton
                icon={arrowBackOutline}
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                label="Back"
              />
            )}
            <div>
              <h1 className="text-display" style={{ margin: 0, fontSize: 28 }}>
                {step === 1 ? t('generator.title') : step === 2 ? 'Enter Details' : 'Generated Code'}
              </h1>
              <div className="text-caption" style={{ marginTop: 2 }}>
                {step === 1
                  ? 'Choose the type of code you want to create'
                  : step === 2
                  ? TYPE_OPTIONS.find((o) => o.type === selectedType)?.title || selectedType.toUpperCase()
                  : generatedLabel}
              </div>
            </div>
          </div>

          {/* Toast notification */}
          <Toast
            message={feedbackToast || ''}
            visible={Boolean(feedbackToast)}
            type={feedbackToast?.includes('Could not') || feedbackToast?.includes('not available') ? 'error' : 'success'}
          />

          {/* STEP 1: Type Selection Grid */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <div
                  key={opt.type}
                  className="sp-card"
                  onClick={() => {
                    setSelectedType(opt.type);
                    setStep(2);
                  }}
                  style={{
                    padding: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${opt.color}1c`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IonIcon icon={opt.icon} style={{ fontSize: 24, color: opt.color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{opt.title}</div>
                    <div className="text-caption" style={{ marginTop: 4, lineHeight: 1.3 }}>
                      {opt.description}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* STEP 2: Input Form */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Form 1: Plain Text */}
              {selectedType === 'text' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="text-caption">Text Message *</label>
                    <span className="text-caption">{textContent.length} chars</span>
                  </div>
                  <textarea
                    rows={5}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter any message, text, notes, or serial number..."
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      color: 'var(--text)',
                      fontSize: 15,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Form 2: Website URL */}
              {selectedType === 'url' && (
                <div>
                  <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                    Website Address *
                  </label>
                  <input
                    type="url"
                    value={urlContent}
                    onChange={(e) => setUrlContent(e.target.value)}
                    placeholder="https://example.com"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      color: 'var(--text)',
                      fontSize: 15,
                      outline: 'none',
                    }}
                  />
                  <div className="text-caption" style={{ marginTop: 6 }}>
                    Prefix https:// is added automatically if omitted
                  </div>
                </div>
              )}

              {/* Form 3: Wi-Fi */}
              {selectedType === 'wifi' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Network Name (SSID) *
                    </label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="MyHomeWiFi"
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        color: 'var(--text)',
                        fontSize: 15,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Security Protocol
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['WPA', 'WEP', 'nopass'] as const).map((sec) => (
                        <button
                          key={sec}
                          className={`sp-chip ${wifiSecurity === sec ? 'active' : ''}`}
                          onClick={() => setWifiSecurity(sec)}
                        >
                          {sec === 'WPA' ? 'WPA / WPA2' : sec === 'nopass' ? 'Open (None)' : 'WEP'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {wifiSecurity !== 'nopass' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label className="text-caption">Network Password</label>
                        <button
                          onClick={() => setShowWifiPass(!showWifiPass)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          {showWifiPass ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <input
                        type={showWifiPass ? 'text' : 'password'}
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        placeholder="Wi-Fi Password"
                        style={{
                          width: '100%',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: '12px 14px',
                          color: 'var(--text)',
                          fontSize: 15,
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setWifiHidden(!wifiHidden)}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Hidden Network</div>
                      <div className="text-caption">Network SSID is not broadcasting</div>
                    </div>
                    <div className={`sp-switch ${wifiHidden ? 'active' : ''}`}>
                      <div className="sp-switch-thumb" />
                    </div>
                  </div>
                </div>
              )}

              {/* Form 4: Contact Card (vCard) */}
              {selectedType === 'contact' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Full Name *"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      color: 'var(--text)',
                      fontSize: 15,
                    }}
                  />
                  <input
                    type="text"
                    value={contactTitle}
                    onChange={(e) => setContactTitle(e.target.value)}
                    placeholder="Job Title"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      color: 'var(--text)',
                      fontSize: 15,
                    }}
                  />
                  <input
                    type="text"
                    value={contactOrg}
                    onChange={(e) => setContactOrg(e.target.value)}
                    placeholder="Company / Organization"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      color: 'var(--text)',
                      fontSize: 15,
                    }}
                  />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Phone number"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      color: 'var(--text)',
                      fontSize: 15,
                    }}
                  />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email address"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      color: 'var(--text)',
                      fontSize: 15,
                    }}
                  />
                  <input
                    type="text"
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                    placeholder="Street / Office Address"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      color: 'var(--text)',
                      fontSize: 15,
                    }}
                  />
                  <input
                    type="url"
                    value={contactUrl}
                    onChange={(e) => setContactUrl(e.target.value)}
                    placeholder="Website (e.g. https://portfolio.com)"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      color: 'var(--text)',
                      fontSize: 15,
                    }}
                  />
                </div>
              )}

              {/* Form 5: Phone Number */}
              {selectedType === 'phone' && (
                <div>
                  <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 234 567 8900"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      color: 'var(--text)',
                      fontSize: 16,
                    }}
                  />
                  <div className="text-caption" style={{ marginTop: 6 }}>
                    Prompts instant direct dialing when scanned
                  </div>
                </div>
              )}

              {/* Form 6: SMS Message */}
              {selectedType === 'sms' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Recipient Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={smsNumber}
                      onChange={(e) => setSmsNumber(e.target.value)}
                      placeholder="+1 234 567 8900"
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text)',
                        fontSize: 15,
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Pre-filled SMS Body
                    </label>
                    <textarea
                      rows={4}
                      value={smsBody}
                      onChange={(e) => setSmsBody(e.target.value)}
                      placeholder="Pre-filled SMS text message..."
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text)',
                        fontSize: 15,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Form 7: Email */}
              {selectedType === 'email' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Recipient Email *
                    </label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="hello@example.com"
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text)',
                        fontSize: 15,
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Inquiry / Meeting"
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text)',
                        fontSize: 15,
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Message Body
                    </label>
                    <textarea
                      rows={3}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Pre-filled email body..."
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text)',
                        fontSize: 15,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Form 8: Location Coordinates */}
              {selectedType === 'geo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                        Latitude *
                      </label>
                      <input
                        type="text"
                        value={geoLat}
                        onChange={(e) => setGeoLat(e.target.value)}
                        placeholder="37.774929"
                        style={{
                          width: '100%',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: 12,
                          color: 'var(--text)',
                          fontSize: 15,
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                        Longitude *
                      </label>
                      <input
                        type="text"
                        value={geoLng}
                        onChange={(e) => setGeoLng(e.target.value)}
                        placeholder="-122.419418"
                        style={{
                          width: '100%',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: 12,
                          color: 'var(--text)',
                          fontSize: 15,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={loadingLocation}
                    className="sp-btn sp-btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', gap: 8 }}
                  >
                    <IonIcon icon={navigateOutline} style={{ color: 'var(--primary)' }} />
                    <span>{loadingLocation ? 'Locating...' : 'Use My Current GPS Position'}</span>
                  </button>
                  <div className="text-caption">
                    Opens directly in Google Maps or default mapping app when scanned
                  </div>
                </div>
              )}

              {/* Form 9: Calendar Event */}
              {selectedType === 'calendar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="Product Launch / Meeting"
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text)',
                        fontSize: 15,
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Location
                    </label>
                    <input
                      type="text"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      placeholder="Main Hall / Zoom link"
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text)',
                        fontSize: 15,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={eventStart}
                        onChange={(e) => setEventStart(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: 10,
                          color: 'var(--text)',
                          fontSize: 13,
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={eventEnd}
                        onChange={(e) => setEventEnd(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: 10,
                          color: 'var(--text)',
                          fontSize: 13,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Event Notes & Description
                    </label>
                    <textarea
                      rows={3}
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      placeholder="Agenda, dial-in details, or notes..."
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text)',
                        fontSize: 15,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Form 10: Product Barcode */}
              {selectedType === 'barcode' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Barcode Standard
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(['CODE128', 'EAN13', 'EAN8', 'UPC', 'CODE39', 'ITF'] as BarcodeStandard[]).map((f) => (
                        <button
                          key={f}
                          className={`sp-chip ${barcodeStandard === f ? 'active' : ''}`}
                          onClick={() => setBarcodeStandard(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                      Barcode Value *
                    </label>
                    <input
                      type="text"
                      value={barcodeValue}
                      onChange={(e) => setBarcodeValue(e.target.value)}
                      placeholder={
                        barcodeStandard === 'EAN13'
                          ? '12 or 13 digits (e.g. 590123412345)'
                          : barcodeStandard === 'EAN8'
                          ? '7 or 8 digits (e.g. 9638507)'
                          : barcodeStandard === 'UPC'
                          ? '11 or 12 digits (e.g. 01234567890)'
                          : barcodeStandard === 'ITF'
                          ? 'Numeric even digits (e.g. 123456)'
                          : 'Enter alphanumeric data'
                      }
                      style={{
                        width: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        color: 'var(--text)',
                        fontSize: 16,
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <div className="text-caption" style={{ marginTop: 6 }}>
                      {barcodeStandard === 'EAN13' && 'Check digit automatically calculated if 12 digits are typed.'}
                      {barcodeStandard === 'EAN8' && 'Check digit automatically calculated if 7 digits are typed.'}
                      {barcodeStandard === 'UPC' && 'Check digit automatically calculated if 11 digits are typed.'}
                      {barcodeStandard === 'CODE39' && 'Supports uppercase letters, numbers and punctuation -.$/+%.'}
                      {barcodeStandard === 'ITF' && 'Interleaved 2 of 5: Numbers only, requires even length.'}
                      {barcodeStandard === 'CODE128' && 'High-density alphanumeric format for shipping and inventory.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Generate CTA Button */}
              <div style={{ marginTop: 10 }}>
                <AppButton
                  variant="primary"
                  fullWidth
                  disabled={!isValid()}
                  onClick={handleGenerate}
                >
                  {t('generator.generate')}
                </AppButton>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Preview and Customization */}
          {step === 3 && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* White preview container */}
              <div
                style={{
                  background: qrColorLight,
                  padding: 24,
                  borderRadius: 20,
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  border: '1px solid var(--border)',
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}
              >
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Generated Code"
                    style={{
                      maxWidth: '100%',
                      maxHeight: generatedFormat === 'QR_CODE' ? 240 : 160,
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div style={{ width: 220, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Loading preview...
                  </div>
                )}
              </div>

              {/* Details card */}
              <div
                className="sp-card"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16 }}>{generatedLabel}</div>
                <div className="text-caption" style={{ wordBreak: 'break-all' }}>
                  {truncate(generatedPayload, 120)}
                </div>
              </div>

              {/* Customization Toggle for QR codes */}
              {generatedFormat === 'QR_CODE' && (
                <div style={{ width: '100%', marginBottom: 16 }}>
                  <button
                    onClick={() => setShowCustomizer(!showCustomizer)}
                    className="sp-btn sp-btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', gap: 8 }}
                  >
                    <IonIcon icon={colorPaletteOutline} />
                    <span>Customize Colors & Error Correction</span>
                  </button>

                  {showCustomizer && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>Code Color</div>
                          <div className="text-caption">Foreground color</div>
                        </div>
                        <input
                          type="color"
                          value={qrColorDark}
                          onChange={(e) => setQrColorDark(e.target.value)}
                          style={{ border: 'none', background: 'none', width: 36, height: 36, cursor: 'pointer' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>Background Color</div>
                          <div className="text-caption">Canvas backdrop</div>
                        </div>
                        <input
                          type="color"
                          value={qrColorLight}
                          onChange={(e) => setQrColorLight(e.target.value)}
                          style={{ border: 'none', background: 'none', width: 36, height: 36, cursor: 'pointer' }}
                        />
                      </div>

                      <div>
                        <span className="text-caption" style={{ display: 'block', marginBottom: 6 }}>
                          Error Correction
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['L', 'M', 'Q', 'H'] as const).map((level) => (
                            <button
                              key={level}
                              className={`sp-chip ${qrEcc === level ? 'active' : ''}`}
                              onClick={() => setQrEcc(level)}
                            >
                              {level === 'L' ? 'L (7%)' : level === 'M' ? 'M (15%)' : level === 'Q' ? 'Q (25%)' : 'H (30%)'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', marginBottom: 12 }}>
                <AppButton
                  variant="primary"
                  icon={shareSocialOutline}
                  onClick={handleShareImage}
                >
                  Share
                </AppButton>
                <AppButton
                  variant="secondary"
                  icon={downloadOutline}
                  onClick={handleDownloadImage}
                >
                  Save
                </AppButton>
                <AppButton
                  variant="secondary"
                  icon={copyOutline}
                  onClick={handleCopyContent}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </AppButton>
              </div>

              <button
                className="sp-btn sp-btn-ghost"
                onClick={() => setStep(1)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Create Another Code
              </button>
            </motion.div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Generator;
