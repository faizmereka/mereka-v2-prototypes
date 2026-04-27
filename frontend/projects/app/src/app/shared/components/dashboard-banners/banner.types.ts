/**
 * Banner category - determines which dashboard shows the banner
 */
export type BannerCategory = 'user' | 'hub';

/**
 * Banner severity - affects styling
 */
export type BannerSeverity = 'info' | 'warning' | 'error' | 'success';

/**
 * Dashboard banner interface
 */
export interface DashboardBanner {
  /** Unique identifier for the banner (e.g., 'email-verification', 'kyc-required') */
  id: string;

  /** Which dashboard should show this banner */
  category: BannerCategory;

  /** Severity level affects styling */
  severity: BannerSeverity;

  /** Short title for the banner */
  title: string;

  /** Descriptive message */
  message: string;

  /** Optional action button label */
  actionLabel?: string;

  /** Optional action handler */
  actionFn?: () => void | Promise<void>;

  /** Whether the banner can be dismissed */
  dismissible: boolean;

  /** Loading state for the action */
  loading?: boolean;
}
