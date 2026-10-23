import React from 'react';

export interface SponsorBannerProps {
  variant?: 'card' | 'compact' | 'inline';
  className?: string;
  style?: React.CSSProperties;
}

export const SponsorBanner: React.FC<SponsorBannerProps> = () => {
  return null;
};

// Aliases for backwards compatibility
export const AdBanner = SponsorBanner;
export type AdBannerProps = SponsorBannerProps;
