import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  searchOutline,
  closeCircleOutline,
  star,
  starOutline,
  trashOutline,
  downloadOutline,
  ellipsisVerticalOutline,
  checkmarkCircle,
  scanOutline,
  timeOutline,
  chevronForwardOutline,
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
  gridOutline,
  codeSlashOutline,
  closeOutline,
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { t } from '../utils/i18n';
import { useHistoryStore } from '../store/useHistoryStore';
import { exportHistory, type ExportFormat } from '../services/export';
import { getDateGroup, formatTime } from '../utils/helpers';
import {
  Card,
  Chip,
  IconButton,
  EmptyState,
  ConfirmDialog,
  Toast,
  AppLogo,
} from '../components/ui';
import { APP_NAME } from '../utils/constants';
import type { HistoryItem } from '../store/types';
import ResultSheet from './Result';

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  url: { icon: globeOutline, color: '#4D7CFF' },
  wifi: { icon: wifiOutline, color: '#00E5A8' },
  contact: { icon: personOutline, color: '#A855F7' },
  phone: { icon: callOutline, color: '#38BDF8' },
  sms: { icon: chatbubbleOutline, color: '#FB923C' },
  email: { icon: mailOutline, color: '#F43F5E' },
  geo: { icon: locationOutline, color: '#10B981' },
  calendar: { icon: calendarOutline, color: '#EC4899' },
  product: { icon: barcodeOutline, color: '#F59E0B' },
  text: { icon: documentTextOutline, color: '#94A3B8' },
};

const FILTER_CHIPS = [
  'All',
  'Favorites',
  'Scanned',
  'Created',
  'URL',
  'Wi-Fi',
  'Contact',
  'Product',
  'Text',
] as const;

interface HistoryProps {
  onNavigateToScan?: () => void;
}

const History: React.FC<HistoryProps> = ({ onNavigateToScan }) => {
  const { items, isLoading, loadHistory, removeItem, removeMany, toggleFavorite, clearAll, restoreItems } =
    useHistoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Multi-select mode
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Result sheet
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Modals & Snackbars
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [undoToast, setUndoToast] = useState<{ message: string; deletedItems: HistoryItem[] } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Long press timer ref
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Filtering and sorting
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Filter by category
        if (activeFilter === 'Favorites' && !item.favorite) return false;
        if (activeFilter === 'Scanned' && item.source !== 'scanned') return false;
        if (activeFilter === 'Created' && item.source !== 'created') return false;
        if (activeFilter === 'URL' && item.type !== 'url') return false;
        if (activeFilter === 'Wi-Fi' && item.type !== 'wifi') return false;
        if (activeFilter === 'Contact' && item.type !== 'contact') return false;
        if (activeFilter === 'Product' && item.type !== 'product') return false;
        if (activeFilter === 'Text' && item.type !== 'text') return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchLabel = item.label.toLowerCase().includes(q);
          const matchContent = item.content.toLowerCase().includes(q);
          const matchFormat = item.format.toLowerCase().includes(q);
          if (!matchLabel && !matchContent && !matchFormat) return false;
        }

        return true;
      })
      .sort((a, b) => (sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp));
  }, [items, activeFilter, searchQuery, sortOrder]);

  // Group by date
  const groupedItems = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {
      Today: [],
      Yesterday: [],
      'This week': [],
      Earlier: [],
    };

    filteredItems.forEach((item) => {
      const g = getDateGroup(item.timestamp);
      if (groups[g]) {
        groups[g].push(item);
      } else {
        groups['Earlier'].push(item);
      }
    });

    return Object.entries(groups).filter(([_, list]) => list.length > 0);
  }, [filteredItems]);

  // Handlers
  const handleDeleteItem = useCallback(
    async (item: HistoryItem) => {
      await Haptics.impact({ style: ImpactStyle.Medium });
      const removed = await removeItem(item.id);
      if (removed) {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndoToast({
          message: 'Item deleted',
          deletedItems: [removed],
        });
        undoTimerRef.current = setTimeout(() => {
          setUndoToast(null);
        }, 5000);
      }
    },
    [removeItem]
  );

  const handleUndo = useCallback(async () => {
    if (undoToast?.deletedItems) {
      await restoreItems(undoToast.deletedItems);
      setUndoToast(null);
    }
  }, [undoToast, restoreItems]);

  const handleToggleFavorite = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await Haptics.impact({ style: ImpactStyle.Light });
      await toggleFavorite(id);
    },
    [toggleFavorite]
  );

  const handleItemPressStart = (id: string) => {
    pressTimerRef.current = setTimeout(() => {
      Haptics.impact({ style: ImpactStyle.Heavy });
      setIsMultiSelect(true);
      setSelectedIds(new Set([id]));
    }, 500);
  };

  const handleItemPressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
  };

  const toggleSelectId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      if (next.size === 0) setIsMultiSelect(false);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    await Haptics.impact({ style: ImpactStyle.Medium });
    const removed = await removeMany(ids);
    setIsMultiSelect(false);
    setSelectedIds(new Set());
    if (removed.length > 0) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoToast({
        message: `${removed.length} items deleted`,
        deletedItems: removed,
      });
      undoTimerRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 5000);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setShowExportMenu(false);
    const toExport = isMultiSelect && selectedIds.size > 0
      ? items.filter((i) => selectedIds.has(i.id))
      : filteredItems;
    if (toExport.length === 0) return;
    try {
      await exportHistory(toExport, format);
    } catch (e) {
      console.error('Export error', e);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
        <div style={{ padding: 'calc(var(--safe-area-top) + var(--top-banner-height) + 16px) 16px calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 40px)' }}>
          {/* Top Bar / Header */}
          {isMultiSelect ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="sp-btn sp-btn-ghost"
                  onClick={() => {
                    setIsMultiSelect(false);
                    setSelectedIds(new Set());
                  }}
                  style={{ padding: '4px 8px' }}
                >
                  Cancel
                </button>
                <span className="text-title" style={{ fontSize: 18 }}>
                  {selectedIds.size} selected
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconButton
                  icon={downloadOutline}
                  onClick={() => setShowExportMenu(true)}
                  label="Export"
                />
                <IconButton
                  icon={trashOutline}
                  onClick={handleDeleteSelected}
                  label="Delete"
                  color="var(--danger)"
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AppLogo size={34} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 className="text-display" style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {APP_NAME}
                  </h1>
                  <span
                    style={{
                      background: 'var(--surface-2)',
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconButton
                  icon={downloadOutline}
                  onClick={() => setShowExportMenu(true)}
                  label="Export"
                />
                <IconButton
                  icon={ellipsisVerticalOutline}
                  onClick={() => setShowClearConfirm(true)}
                  label="More options"
                />
              </div>
            </div>
          )}

          {/* Search bar */}
          <div
            style={{
              position: 'relative',
              marginBottom: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              height: 44,
            }}
          >
            <IonIcon icon={searchOutline} style={{ color: 'var(--text-muted)', fontSize: 18, marginRight: 8 }} />
            <input
              type="text"
              placeholder={t('history.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: 15,
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <IonIcon icon={closeCircleOutline} style={{ fontSize: 18 }} />
              </button>
            )}
          </div>

          {/* Filter Chips Bar (Horizontal Scroll) */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 12,
              scrollbarWidth: 'none',
            }}
          >
            {FILTER_CHIPS.map((filter) => (
              <Chip
                key={filter}
                label={filter}
                active={activeFilter === filter}
                onClick={() => setActiveFilter(filter)}
              />
            ))}
          </div>

          {/* History Item List */}
          {filteredItems.length === 0 ? (
            <div style={{ marginTop: 40 }}>
              <EmptyState
                icon={scanOutline}
                title={searchQuery ? t('history.noMatch') : t('history.noHistory')}
                description={searchQuery ? 'Try another search term' : 'Scan a QR code or barcode to see it here'}
                actionLabel={searchQuery ? undefined : t('history.startScanning')}
                onAction={onNavigateToScan}
              />
            </div>
          ) : (
            <div>
              {groupedItems.map(([groupName, groupList]) => (
                <div key={groupName} style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '8px 4px 6px',
                    }}
                  >
                    {groupName}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {groupList.map((item, idx) => {
                      const iconConfig = TYPE_ICONS[item.type] || TYPE_ICONS.text;
                      const isSelected = selectedIds.has(item.id);

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.03 }}
                          onMouseDown={() => handleItemPressStart(item.id)}
                          onMouseUp={handleItemPressEnd}
                          onTouchStart={() => handleItemPressStart(item.id)}
                          onTouchEnd={handleItemPressEnd}
                        >
                          <div
                            onClick={() => {
                              if (isMultiSelect) {
                                toggleSelectId(item.id);
                              } else {
                                setSelectedItem(item);
                              }
                            }}
                            className="sp-card"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              cursor: 'pointer',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                              background: isSelected ? 'rgba(0, 229, 168, 0.08)' : 'var(--surface)',
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                              {isMultiSelect ? (
                                <div style={{ fontSize: 22, color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                                  <IonIcon icon={isSelected ? checkmarkCircle : timeOutline} />
                                </div>
                              ) : (
                                <div
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: `${iconConfig.color}1c`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <IonIcon icon={iconConfig.icon} style={{ fontSize: 20, color: iconConfig.color }} />
                                </div>
                              )}

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {item.label}
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginTop: 3,
                                    color: 'var(--text-muted)',
                                    fontSize: 12,
                                  }}
                                >
                                  <span>{item.format}</span>
                                  <span>•</span>
                                  <span>{formatTime(item.timestamp)}</span>
                                  {item.source === 'created' && (
                                    <>
                                      <span>•</span>
                                      <span style={{ color: 'var(--primary-2)' }}>Created</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                onClick={(e) => handleToggleFavorite(item.id, e)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 6,
                                  color: item.favorite ? 'var(--warning)' : 'var(--text-muted)',
                                }}
                              >
                                <IonIcon icon={item.favorite ? star : starOutline} style={{ fontSize: 18 }} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 6,
                                  color: 'var(--danger)',
                                }}
                              >
                                <IonIcon icon={trashOutline} style={{ fontSize: 16 }} />
                              </button>
                              <IonIcon icon={chevronForwardOutline} style={{ color: 'var(--text-muted)', fontSize: 16 }} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Undo Toast */}
        <Toast
          message={undoToast?.message || ''}
          type="info"
          visible={Boolean(undoToast)}
          action={{
            label: 'Undo',
            onClick: handleUndo,
          }}
        />

        {/* Export Modal / Action Sheet */}
        {showExportMenu &&
          createPortal(
            <motion.div
              className="sp-dialog-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportMenu(false)}
            >
              <motion.div
                className="sp-dialog"
                initial={{ scale: 0.92, opacity: 0, y: 14 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 14 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                style={{ padding: '22px 20px 20px' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: 'rgba(0, 208, 151, 0.12)',
                        border: '1.5px solid rgba(0, 208, 151, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                      }}
                    >
                      <IonIcon icon={downloadOutline} style={{ fontSize: 24 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3, color: 'var(--text)' }}>
                        Export History
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        Select file format to save your scans
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setShowExportMenu(false)}
                    aria-label="Close"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <IonIcon icon={closeOutline} style={{ fontSize: 18 }} />
                  </motion.button>
                </div>

                {/* Export Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0 18px' }}>
                  {/* CSV */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      Haptics.impact({ style: ImpactStyle.Light });
                      handleExport('csv');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '13px 14px',
                      borderRadius: 16,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: 'rgba(0, 208, 151, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#00D097',
                        }}
                      >
                        <IonIcon icon={gridOutline} style={{ fontSize: 20 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                          CSV Spreadsheet
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          For Excel, Google Sheets & Numbers
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: 'rgba(0, 208, 151, 0.15)',
                        color: '#009668',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      .csv
                    </span>
                  </motion.button>

                  {/* JSON */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      Haptics.impact({ style: ImpactStyle.Light });
                      handleExport('json');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '13px 14px',
                      borderRadius: 16,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: 'rgba(56, 189, 248, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#38BDF8',
                        }}
                      >
                        <IonIcon icon={codeSlashOutline} style={{ fontSize: 20 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                          JSON Database
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Full raw objects with metadata
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#0284C7',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      .json
                    </span>
                  </motion.button>

                  {/* Plain Text */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      Haptics.impact({ style: ImpactStyle.Light });
                      handleExport('txt');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '13px 14px',
                      borderRadius: 16,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: 'rgba(168, 85, 247, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#A855F7',
                        }}
                      >
                        <IonIcon icon={documentTextOutline} style={{ fontSize: 20 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                          Plain Text Document
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Clean list of contents & timestamps
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#7E22CE',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      .txt
                    </span>
                  </motion.button>
                </div>

                {/* Cancel Button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="sp-btn sp-btn-secondary"
                  onClick={() => setShowExportMenu(false)}
                  style={{ width: '100%', height: 44, borderRadius: 14, fontWeight: 600, justifyContent: 'center' }}
                >
                  Cancel
                </motion.button>
              </motion.div>
            </motion.div>,
            document.body
          )}


        {/* Clear All Confirmation Dialog */}
        <ConfirmDialog
          open={showClearConfirm}
          title={t('history.clearAll')}
          message="Are you sure you want to clear all history items? This action cannot be undone."
          confirmLabel={t('common.confirm')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={async () => {
            setShowClearConfirm(false);
            await clearAll();
          }}
          onCancel={() => setShowClearConfirm(false)}
        />

        {/* Result Sheet Reopen */}
        <AnimatePresence>
          {selectedItem && (
            <ResultSheet
              item={selectedItem}
              isOpen={Boolean(selectedItem)}
              onClose={() => setSelectedItem(null)}
            />
          )}
        </AnimatePresence>
      </IonContent>
    </IonPage>
  );
};

export default History;
