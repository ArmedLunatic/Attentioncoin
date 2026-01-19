/**
 * Design Tokens for Attention Coin Protocol Interface
 *
 * These tokens ensure visual consistency and enforce the premium aesthetic.
 * All values are designed for a $100M+ financial primitive feel.
 */

// ─────────────────────────────────────────────────────────────────────────────
// MOTION
// Rules: 150-250ms, ease-in-out only, no bounce, no playful easing
// ─────────────────────────────────────────────────────────────────────────────

export const motion = {
  duration: {
    fast: 150,      // Quick feedback (hover states)
    default: 200,   // Standard transitions
    slow: 250,      // Emphasis transitions
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-in-out equivalent
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  // Framer Motion spring config - subtle, no bounce
  spring: {
    stiffness: 300,
    damping: 30,
  },
} as const;

// Framer Motion variants following the motion rules
export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: motion.duration.default / 1000, ease: [0.4, 0, 0.2, 1] },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 12 },
    transition: { duration: motion.duration.default / 1000, ease: [0.4, 0, 0.2, 1] },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: motion.duration.default / 1000, ease: [0.4, 0, 0.2, 1] },
  },
  lift: {
    whileHover: { y: -2 },
    whileTap: { scale: 0.98 },
    transition: { duration: motion.duration.fast / 1000, ease: [0.4, 0, 0.2, 1] },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SPACING
// Consistent rhythm for visual hierarchy
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  section: {
    sm: 'py-16 px-4',
    md: 'py-24 px-4',
    lg: 'py-32 px-4',
  },
  container: {
    sm: 'max-w-3xl mx-auto',
    md: 'max-w-5xl mx-auto',
    lg: 'max-w-6xl mx-auto',
  },
  gap: {
    xs: 'gap-2',
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-12',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// COLORS
// Premium dark palette with emerald accents
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  bg: {
    primary: '#030303',
    surface: '#0a0a0a',
    surfaceLight: '#141414',
    surfaceElevated: '#1a1a1a',
  },
  // Borders
  border: {
    default: '#1f1f1f',
    light: '#2a2a2a',
    accent: 'rgba(16, 185, 129, 0.3)',
  },
  // Primary - Emerald
  primary: {
    default: '#10b981',
    light: '#34d399',
    dim: '#059669',
    glow: 'rgba(16, 185, 129, 0.4)',
    subtle: 'rgba(16, 185, 129, 0.1)',
  },
  // Secondary - Violet
  secondary: {
    default: '#a78bfa',
    dim: '#8b5cf6',
    glow: 'rgba(167, 139, 250, 0.4)',
    subtle: 'rgba(167, 139, 250, 0.1)',
  },
  // Text
  text: {
    primary: '#fafafa',
    secondary: '#a3a3a3',
    muted: '#737373',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY
// Maximum two font families, strong hierarchy
// ─────────────────────────────────────────────────────────────────────────────

export const typography = {
  // Headlines
  headline: {
    hero: 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter',
    section: 'text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight',
    subsection: 'text-2xl sm:text-3xl font-semibold tracking-tight',
  },
  // Body
  body: {
    lg: 'text-lg sm:text-xl text-muted-light leading-relaxed',
    md: 'text-base text-muted leading-relaxed',
    sm: 'text-sm text-muted leading-relaxed',
  },
  // Labels
  label: {
    lg: 'text-sm font-medium uppercase tracking-wider text-muted',
    sm: 'text-xs font-medium uppercase tracking-wider text-muted',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ELEVATION
// Consistent shadow and glow rules
// ─────────────────────────────────────────────────────────────────────────────

export const elevation = {
  none: 'shadow-none',
  sm: 'shadow-elevation-1',
  md: 'shadow-elevation-2',
  lg: 'shadow-elevation-3',
  glow: {
    sm: 'shadow-glow-sm',
    md: 'shadow-glow-md',
    lg: 'shadow-glow-lg',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// BORDER RADIUS
// Consistent radius rules
// ─────────────────────────────────────────────────────────────────────────────

export const radius = {
  sm: 'rounded-lg',      // 8px
  md: 'rounded-xl',      // 12px
  lg: 'rounded-2xl',     // 16px
  xl: 'rounded-3xl',     // 24px
  full: 'rounded-full',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// GROWTH MAP PHASES
// Protocol evolution stages
// ─────────────────────────────────────────────────────────────────────────────

export interface GrowthPhase {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  status: 'active' | 'upcoming' | 'future';
  features: string[];
}

export const growthPhases: GrowthPhase[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    subtitle: 'Submit · Earn',
    description: 'Manual approvals and community trust layer. The foundation of attention-based rewards.',
    status: 'active',
    features: [
      'Tweet submission',
      'Manual review',
      'Points & badges',
      'Community trust layer',
    ],
  },
  {
    id: 'assisted',
    title: 'Assisted Automation',
    subtitle: 'Engage · Earn',
    description: 'Reduced manual review with automatic engagement tracking and spam filtering.',
    status: 'upcoming',
    features: [
      'Automatic signal tracking',
      'Spam filtering',
      'Scoring assistance',
      'Reduced review friction',
    ],
  },
  {
    id: 'autonomous',
    title: 'Autonomous Attention',
    subtitle: 'Exist · Earn',
    description: 'No submission required. Protocol observes and rewards real contribution passively.',
    status: 'future',
    features: [
      'Passive earning',
      'Wallet + social tracking',
      'Protocol-level scoring',
      'Zero submission friction',
    ],
  },
  {
    id: 'ecosystem',
    title: 'Ecosystem Expansion',
    subtitle: 'Infrastructure Layer',
    description: 'Third-party projects onboard. Attention Coin becomes infrastructure.',
    status: 'future',
    features: [
      'Project onboarding',
      'Multi-campaign support',
      'Creator dashboards',
      'Partner integrations',
    ],
  },
  {
    id: 'launchpad',
    title: 'Launchpad Evolution',
    subtitle: 'Attention as Capital',
    description: 'Projects launch using attention history. Contribution-based allocation.',
    status: 'future',
    features: [
      'Attention-based access',
      'Contribution allocation',
      'Capital formation',
      'Launch infrastructure',
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CLASSES
// Reusable class combinations
// ─────────────────────────────────────────────────────────────────────────────

export const componentClasses = {
  card: {
    base: 'bg-surface border border-border rounded-2xl',
    interactive: 'bg-surface border border-border rounded-2xl transition-all duration-200 hover:border-border-light',
    elevated: 'bg-surface-light border border-border rounded-2xl shadow-elevation-2',
  },
  button: {
    primary: 'bg-primary text-black font-semibold px-6 py-3 rounded-xl transition-all duration-200',
    secondary: 'bg-surface-light border border-border text-white font-medium px-6 py-3 rounded-xl transition-all duration-200',
    ghost: 'text-muted hover:text-white transition-colors duration-150',
  },
  node: {
    active: 'bg-primary/20 border-primary/40',
    upcoming: 'bg-secondary/10 border-secondary/30',
    future: 'bg-surface-light border-border',
  },
} as const;
