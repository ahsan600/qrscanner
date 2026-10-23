import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IonIcon } from '@ionic/react';
import {
  closeOutline,
  sparklesOutline,
  giftOutline,
  checkmarkCircle,
  openOutline,
  shieldCheckmarkOutline,
  star,
  alertCircleOutline,
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
import { monetizationService } from '../../services/monetization';

interface ActiveSession {
  type: 'interstitial' | 'rewarded' | 'appOpen';
  onComplete: (rewardEarned?: boolean) => void;
}

export const RewardModal: React.FC = () => {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [rewardEarned, setRewardEarned] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalDurationRef = useRef<number>(5);

  useEffect(() => {
    const unsubscribe = monetizationService.subscribeSimulator((data) => {
      const duration = data.type === 'rewarded' ? 8 : data.type === 'appOpen' ? 4 : 5;
      totalDurationRef.current = duration;
      setSecondsRemaining(duration);
      setCanSkip(false);
      setRewardEarned(false);
      setShowExitConfirm(false);
      setSession(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanSkip(true);
          if (session.type === 'rewarded') {
            setRewardEarned(true);
            Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [session]);

  const handleClose = (forceDismissReward = false) => {
    if (!session) return;

    if (session.type === 'rewarded' && !rewardEarned && !forceDismissReward) {
      setShowExitConfirm(true);
      return;
    }

    const currentSession = session;
    const earned = session.type === 'rewarded' ? (rewardEarned && !forceDismissReward) : true;
    setSession(null);
    currentSession.onComplete(earned);
  };

  const handleOpenSponsor = async () => {
    try {
      await Browser.open({ url: 'https://cloud.google.com' });
    } catch {
      window.open('https://cloud.google.com', '_system');
    }
  };

  if (!session) return null;

  const progressPercent =
    ((totalDurationRef.current - secondsRemaining) / totalDurationRef.current) * 100;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Top Bar with Timer and Skip/Close Button */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(var(--safe-area-top) + 16px)',
          left: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.05em',
            }}
          >
            {session.type === 'rewarded'
              ? 'REWARD SESSION'
              : session.type === 'appOpen'
              ? 'APP OPEN TEST'
              : 'SPONSORED'}
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}>
            {secondsRemaining > 0 ? (
              session.type === 'rewarded' ? (
                `Reward in ${secondsRemaining}s`
              ) : session.type === 'appOpen' ? (
                `Continue in ${secondsRemaining}s`
              ) : (
                `Skip in ${secondsRemaining}s`
              )
            ) : rewardEarned ? (
              <span style={{ color: '#00E5A8', fontWeight: 600 }}>Reward Unlocked!</span>
            ) : (
              'Ready to skip'
            )}
          </span>
        </div>

        {canSkip ? (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleClose(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              background: rewardEarned ? '#00E5A8' : '#FFFFFF',
              color: '#0A0E1A',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {session.type === 'rewarded' && rewardEarned ? (
              <>
                <IonIcon icon={checkmarkCircle} style={{ fontSize: 16 }} />
                <span>Claim Reward</span>
              </>
            ) : (
              <>
                <span>Close</span>
                <IonIcon icon={closeOutline} style={{ fontSize: 16 }} />
              </>
            )}
          </motion.button>
        ) : (
          <button
            onClick={() => handleClose(false)}
            aria-label="Exit"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IonIcon icon={closeOutline} style={{ fontSize: 18 }} />
          </button>
        )}
      </div>

      {/* Progress Bar Header */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(var(--safe-area-top) + 64px)',
          left: 16,
          right: 16,
          height: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background:
              session.type === 'rewarded'
                ? 'linear-gradient(90deg, #A855F7, #00E5A8)'
                : 'linear-gradient(90deg, #4D7CFF, #38BDF8)',
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#131926',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: 24,
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
          position: 'relative',
        }}
      >
        {session.type === 'rewarded' && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 999,
              background: rewardEarned
                ? 'rgba(0, 229, 168, 0.15)'
                : 'rgba(168, 85, 247, 0.15)',
              border: `1px solid ${rewardEarned ? '#00E5A8' : '#A855F7'}`,
              color: rewardEarned ? '#00E5A8' : '#C084FC',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <IonIcon icon={rewardEarned ? checkmarkCircle : giftOutline} />
            {rewardEarned
              ? '24-Hour Pass Unlocked!'
              : 'Complete session to unlock 24h pass'}
          </div>
        )}

        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #4D7CFF, #A855F7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 10px 25px rgba(77, 124, 255, 0.4)',
          }}
        >
          <IonIcon icon={sparklesOutline} style={{ fontSize: 42, color: '#FFFFFF' }} />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px 0', color: '#FFFFFF' }}>
          ScanPro Cloud Backup
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: '#F59E0B',
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          <IonIcon icon={star} />
          <IonIcon icon={star} />
          <IonIcon icon={star} />
          <IonIcon icon={star} />
          <IonIcon icon={star} />
          <span style={{ color: 'rgba(255, 255, 255, 0.7)', marginLeft: 4 }}>
            4.9 • 100K+ Installs
          </span>
        </div>

        <p
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.75)',
            lineHeight: 1.5,
            margin: '0 0 20px 0',
          }}
        >
          Automatically sync all your scanned barcodes, Wi-Fi keys, and business contacts across devices with end-to-end encryption.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleOpenSponsor}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #4D7CFF, #38BDF8)',
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 6px 20px rgba(77, 124, 255, 0.4)',
          }}
        >
          <span>Install Now – Free</span>
          <IonIcon icon={openOutline} />
        </motion.button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 14,
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: 11,
          }}
        >
          <IonIcon icon={shieldCheckmarkOutline} />
          <span>Verified Partner</span>
        </div>
      </motion.div>

      {/* Exit confirmation modal for rewarded session */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'absolute',
              maxWidth: 340,
              background: '#1F293D',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 20,
              padding: 20,
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              zIndex: 20,
            }}
          >
            <IonIcon icon={alertCircleOutline} style={{ fontSize: 36, color: '#F59E0B' }} />
            <h3 style={{ color: '#FFFFFF', fontSize: 17, margin: '10px 0 6px' }}>
              Leave without reward?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 16px' }}>
              If you close now, you will lose your 24-hour pass.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #4D7CFF, #38BDF8)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Keep Watching
              </button>
              <button
                onClick={() => handleClose(true)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Exit Anyway
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};

// Aliases for compatibility
export const WebAdSimulator = RewardModal;
