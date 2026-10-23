import React from 'react';
import { createPortal } from 'react-dom';
import { IonIcon } from '@ionic/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  chevronForwardOutline,
  trashOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  informationCircleOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface AppButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const AppButton: React.FC<AppButtonProps> = ({
  variant = 'primary',
  icon,
  children,
  onClick,
  disabled = false,
  fullWidth = false,
  className = '',
  style = {},
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={`sp-btn sp-btn-${variant} ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={{ ...(fullWidth ? { width: '100%' } : {}), ...style }}
    >
      {icon && <IonIcon icon={icon} style={{ fontSize: '20px' }} />}
      {children}
    </motion.button>
  );
};

interface IconButtonProps {
  icon: string;
  onClick?: () => void;
  label?: string;
  color?: string;
  className?: string;
  size?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  label,
  color,
  className = '',
  size = 24,
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      className={`sp-btn-icon ${className}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <IonIcon icon={icon} style={{ fontSize: `${size}px`, color }} />
    </motion.button>
  );
};

interface ChipProps {
  label: string;
  active?: boolean;
  icon?: string;
  onClick?: () => void;
  color?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  active = false,
  icon,
  onClick,
  color,
}) => {
  return (
    <button
      className={`sp-chip ${active ? 'active' : ''}`}
      onClick={onClick}
      style={color && !active ? { borderColor: color, color } : undefined}
    >
      {icon && <IonIcon icon={icon} style={{ fontSize: '14px' }} />}
      {label}
    </button>
  );
};

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, onClick, className = '' }) => {
  return (
    <div className={`sp-card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <div className={`glass-panel ${className}`} style={style}>
      {children}
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  return <div className="sp-section-header">{title}</div>;
};

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <motion.div
      className="sp-empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="sp-empty-state-icon">
        <IonIcon icon={icon} style={{ fontSize: '36px', color: 'var(--text-muted)' }} />
      </div>
      <div className="text-title">{title}</div>
      {description && (
        <div className="text-body" style={{ color: 'var(--text-muted)' }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <AppButton variant="primary" onClick={onAction}>
          {actionLabel}
        </AppButton>
      )}
    </motion.div>
  );
};

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
}) => {
  return (
    <div
      className="sp-skeleton"
      style={{ width, height, borderRadius }}
    />
  );
};

interface ToggleRowProps {
  icon: string;
  iconColor?: string;
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

const getBadgeBg = (color: string) => {
  if (color.startsWith('var(')) {
    return `color-mix(in srgb, ${color} 14%, transparent)`;
  }
  return `${color}1a`;
};

export const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  iconColor = 'var(--primary)',
  label,
  sublabel,
  value,
  onChange,
}) => {
  return (
    <div
      className="sp-toggle-row"
      onClick={() => onChange(!value)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <div
        className="sp-toggle-row-icon"
        style={{ background: getBadgeBg(iconColor) }}
      >
        <IonIcon icon={icon} style={{ fontSize: '18px', color: iconColor }} />
      </div>
      <div className="sp-toggle-row-content">
        <div className="sp-toggle-row-label">{label}</div>
        {sublabel && <div className="sp-toggle-row-sublabel">{sublabel}</div>}
      </div>
      <div
        className={`sp-switch ${value ? 'active' : ''}`}
        role="switch"
        aria-checked={value}
      >
        <div className="sp-switch-thumb" />
      </div>
    </div>
  );
};

interface NavRowProps {
  icon: string;
  iconColor?: string;
  label: string;
  sublabel?: string;
  value?: string;
  onClick: () => void;
  danger?: boolean;
}

export const NavRow: React.FC<NavRowProps> = ({
  icon,
  iconColor = 'var(--primary)',
  label,
  sublabel,
  value,
  onClick,
  danger,
}) => {
  const finalColor = danger ? 'var(--danger)' : iconColor;
  return (
    <button
      className="sp-toggle-row"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div
        className="sp-toggle-row-icon"
        style={{ background: getBadgeBg(finalColor) }}
      >
        <IonIcon
          icon={icon}
          style={{
            fontSize: '18px',
            color: finalColor,
          }}
        />
      </div>
      <div className="sp-toggle-row-content">
        <div
          className="sp-toggle-row-label"
          style={danger ? { color: 'var(--danger)' } : undefined}
        >
          {label}
        </div>
        {sublabel && <div className="sp-toggle-row-sublabel">{sublabel}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {value && (
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{value}</span>
        )}
        <IonIcon
          icon={chevronForwardOutline}
          style={{ fontSize: '18px', color: 'var(--text-muted)', opacity: 0.6 }}
        />
      </div>
    </button>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  icon,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return createPortal(
    <motion.div
      className="sp-dialog-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="sp-dialog"
        initial={{ scale: 0.92, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 14 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '28px 22px 22px', textAlign: 'center' }}
      >
        {/* Centered Icon Badge with Ambient Halo */}
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: danger ? 'rgba(255, 84, 112, 0.12)' : 'rgba(0, 208, 151, 0.12)',
            border: danger ? '1.5px solid rgba(255, 84, 112, 0.3)' : '1.5px solid rgba(0, 208, 151, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: danger ? 'var(--danger)' : 'var(--primary)',
            boxShadow: danger
              ? '0 10px 24px -4px rgba(255, 84, 112, 0.25)'
              : '0 10px 24px -4px rgba(0, 208, 151, 0.25)',
          }}
        >
          <IonIcon icon={icon || (danger ? trashOutline : alertCircleOutline)} style={{ fontSize: 28 }} />
        </div>

        {/* Title & Message */}
        <div className="sp-dialog-title" style={{ fontSize: 20, marginBottom: 8 }}>
          {title}
        </div>
        <div
          className="sp-dialog-message"
          style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 auto 24px', maxWidth: 300 }}
        >
          {message}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="sp-btn sp-btn-secondary"
            onClick={onCancel}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              fontWeight: 600,
              fontSize: 15,
              justifyContent: 'center',
            }}
          >
            {cancelLabel}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className={`sp-btn ${danger ? 'sp-btn-danger' : 'sp-btn-primary'}`}
            onClick={() => {
              Haptics.impact({ style: danger ? ImpactStyle.Heavy : ImpactStyle.Medium });
              onConfirm();
            }}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              fontWeight: 600,
              fontSize: 15,
              justifyContent: 'center',
              boxShadow: danger
                ? '0 8px 20px -4px rgba(255, 84, 112, 0.45)'
                : '0 8px 20px -4px rgba(var(--primary-rgb), 0.45)',
            }}
          >
            {confirmLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export interface PickerOption<T = any> {
  label: string;
  value: T;
  description?: string;
  icon?: string;
}

interface OptionPickerDialogProps<T = any> {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  options: PickerOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export const OptionPickerDialog: React.FC<OptionPickerDialogProps> = ({
  open,
  title,
  subtitle,
  icon,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  if (!open) return null;

  return createPortal(
    <motion.div
      className="sp-dialog-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
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
        {/* Header with Icon, Title, and Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {icon && (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(var(--primary-rgb), 0.12)',
                  border: '1px solid rgba(var(--primary-rgb), 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={icon} style={{ fontSize: 22 }} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onClose}
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
              flexShrink: 0,
            }}
          >
            <IonIcon icon={closeOutline} style={{ fontSize: 18 }} />
          </motion.button>
        </div>

        {/* Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '6px 0 16px' }}>
          {options.map((opt) => {
            const isSelected = selectedValue === opt.value;
            return (
              <motion.button
                key={String(opt.value)}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  Haptics.impact({ style: ImpactStyle.Light });
                  onSelect(opt.value);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 16,
                  border: isSelected
                    ? '1.5px solid var(--primary)'
                    : '1.5px solid transparent',
                  background: isSelected
                    ? 'color-mix(in srgb, var(--surface) 90%, var(--primary) 10%)'
                    : 'var(--surface-2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {opt.icon && (
                    <IonIcon
                      icon={opt.icon}
                      style={{
                        fontSize: 18,
                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                      }}
                    />
                  )}
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--primary)' : 'var(--text)',
                      }}
                    >
                      {opt.label}
                    </div>
                    {opt.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {opt.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Radio / Check Indicator */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    border: isSelected ? 'none' : '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: isSelected ? '0 0 8px rgba(var(--primary-rgb), 0.5)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSelected && <IonIcon icon={checkmarkOutline} style={{ fontSize: 14, strokeWidth: 2.5 }} />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Footer Cancel Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="sp-btn sp-btn-secondary"
          onClick={onClose}
          style={{ width: '100%', height: 44, borderRadius: 14, fontWeight: 600, justifyContent: 'center' }}
        >
          Cancel
        </motion.button>
      </motion.div>
    </motion.div>,
    document.body
  );
};

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  action,
  visible,
}) => {
  const icon =
    type === 'success'
      ? checkmarkCircleOutline
      : type === 'error'
      ? alertCircleOutline
      : informationCircleOutline;

  const iconColor =
    type === 'success' ? '#00D097' : type === 'error' ? '#FF5470' : '#38BDF8';

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sp-toast"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            position: 'fixed',
            bottom: 'calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 20px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            padding: '10px 18px',
            borderRadius: 24,
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: '92vw',
            pointerEvents: 'auto',
          }}
        >
          <IonIcon icon={icon} style={{ fontSize: 20, color: iconColor, flexShrink: 0 }} />
          <span style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: 500, letterSpacing: -0.1 }}>
            {message}
          </span>
          {action && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={action.onClick}
              style={{
                background: 'rgba(0, 208, 151, 0.2)',
                border: '1px solid rgba(0, 208, 151, 0.4)',
                color: '#00D097',
                padding: '4px 12px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: 4,
                flexShrink: 0,
              }}
            >
              {action.label}
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export interface AppLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 36, className = '', style }) => {
  const iconSize = Math.round(size * 0.62);
  const borderRadius = Math.round(size * 0.28);
  return (
    <div
      className={`app-logo ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius,
        background: 'var(--primary-gradient)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(var(--primary-rgb), 0.32)',
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 20V9C6 7.34 7.34 6 9 6H20"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M40 6H51C52.66 6 54 7.34 54 9V20"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M54 40V51C54 52.66 52.66 54 51 54H40"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M20 54H9C7.34 54 6 52.66 6 51V40"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect x="14" y="14" width="10" height="10" rx="2" fill="#FFFFFF" />
        <rect x="36" y="14" width="10" height="10" rx="2" fill="#FFFFFF" />
        <rect x="14" y="36" width="10" height="10" rx="2" fill="#FFFFFF" />
        <rect x="28" y="28" width="5" height="5" rx="1.2" fill="#FFFFFF" />
        <rect x="38" y="38" width="8" height="8" rx="2" fill="#FFFFFF" opacity="0.85" />
      </svg>
    </div>
  );
};



