# ATTENTION Design System v2.0

## Design Philosophy

**Core Identity**: Premium infrastructure meets refined energy.
**Aesthetic**: Dark fintech with controlled vibrancy — confident, not loud.
**Feel**: Like a Bloomberg terminal redesigned by a luxury brand.

### Guiding Principles

1. **Restraint over excess** — Every color, gradient, and animation must earn its place
2. **Depth over flatness** — Layered surfaces create spatial hierarchy
3. **Precision over decoration** — Sharp typography, exact spacing, intentional motion
4. **Confidence over hype** — Let quality speak; avoid crypto clichés

---

## 1. COLOR SYSTEM

### 1.1 Base Palette (Dark-First)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#060608` | Page background, deepest layer |
| `--bg-secondary` | `#0c0c10` | Card backgrounds, elevated surfaces |
| `--bg-tertiary` | `#121218` | Hover states, input backgrounds |
| `--bg-elevated` | `#18181f` | Modal backgrounds, dropdowns |

### 1.2 Border & Divider

| Token | Hex | Usage |
|-------|-----|-------|
| `--border-subtle` | `#1e1e26` | Default borders, dividers |
| `--border-default` | `#2a2a35` | Card borders, input borders |
| `--border-emphasis` | `#3a3a48` | Hover borders, focus states |

### 1.3 Text Hierarchy

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#f4f4f5` | Headlines, primary content |
| `--text-secondary` | `#a1a1aa` | Body text, descriptions |
| `--text-tertiary` | `#71717a` | Captions, timestamps, labels |
| `--text-muted` | `#52525b` | Disabled states, placeholders |

### 1.4 Accent: Refined Emerald (Primary)

Deep, desaturated emerald — elegant, not neon.

| Token | Hex | Usage |
|-------|-----|-------|
| `--emerald-950` | `#022c22` | Subtle backgrounds, tints |
| `--emerald-900` | `#064e3b` | Dark accent fills |
| `--emerald-700` | `#047857` | Primary accent (main) |
| `--emerald-500` | `#10b981` | Highlights, success states |
| `--emerald-400` | `#34d399` | Interactive hovers (use sparingly) |

**Primary Accent**: `--emerald-700` (#047857)
**Accent Glow**: `--emerald-500` at 20% opacity for subtle luminosity

### 1.5 Accent: Refined Violet (Secondary)

Cool depth for gradients and secondary emphasis.

| Token | Hex | Usage |
|-------|-----|-------|
| `--violet-950` | `#1e1033` | Gradient depth |
| `--violet-900` | `#2e1065` | Deep violet fills |
| `--violet-700` | `#6d28d9` | Secondary accent |
| `--violet-500` | `#8b5cf6` | Gradient highlights |
| `--violet-400` | `#a78bfa` | Light accents (rare) |

### 1.6 Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#059669` | Success states, confirmations |
| `--warning` | `#d97706` | Warnings, pending states |
| `--error` | `#dc2626` | Errors, destructive actions |
| `--info` | `#0891b2` | Informational states |

### 1.7 Gradient Definitions

**Atmospheric Gradient (Background)**
```css
--gradient-atmosphere: radial-gradient(
  ellipse 80% 50% at 50% -20%,
  rgba(6, 78, 59, 0.15) 0%,
  rgba(30, 16, 51, 0.08) 50%,
  transparent 100%
);
```

**Accent Gradient (Buttons, Highlights)**
```css
--gradient-accent: linear-gradient(
  135deg,
  #047857 0%,
  #065f46 50%,
  #064e3b 100%
);
```

**Text Gradient (Headlines)**
```css
--gradient-text: linear-gradient(
  135deg,
  #f4f4f5 0%,
  #a1a1aa 100%
);
```

**Depth Gradient (Cards)**
```css
--gradient-surface: linear-gradient(
  180deg,
  rgba(255, 255, 255, 0.03) 0%,
  rgba(255, 255, 255, 0) 100%
);
```

---

## 2. TYPOGRAPHY SYSTEM

### 2.1 Font Stack

| Role | Font | Fallback |
|------|------|----------|
| Display | **Geist** | system-ui, sans-serif |
| Body | **Geist** | system-ui, sans-serif |
| Mono | **Geist Mono** | ui-monospace, monospace |

**Why Geist**: Modern, precise, excellent weight range. Used by Vercel — signals technical sophistication without being overused like Inter.

### 2.2 Type Scale

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|-------|------|-------------|--------|----------------|-------|
| `--display-xl` | 72px / 4.5rem | 1.0 | 600 | -0.03em | Hero headline |
| `--display-lg` | 56px / 3.5rem | 1.05 | 600 | -0.025em | Section headers |
| `--display-md` | 40px / 2.5rem | 1.1 | 600 | -0.02em | Card titles, large |
| `--display-sm` | 30px / 1.875rem | 1.2 | 600 | -0.015em | Subsection headers |
| `--heading-lg` | 24px / 1.5rem | 1.3 | 600 | -0.01em | Card headers |
| `--heading-md` | 20px / 1.25rem | 1.4 | 600 | -0.01em | Component titles |
| `--heading-sm` | 16px / 1rem | 1.4 | 600 | 0 | Labels, small headers |
| `--body-lg` | 18px / 1.125rem | 1.6 | 400 | 0 | Lead paragraphs |
| `--body-md` | 16px / 1rem | 1.6 | 400 | 0 | Body text |
| `--body-sm` | 14px / 0.875rem | 1.5 | 400 | 0 | Secondary text |
| `--caption` | 12px / 0.75rem | 1.4 | 500 | 0.02em | Captions, labels |
| `--mono-md` | 14px / 0.875rem | 1.5 | 400 | 0 | Code, addresses |
| `--mono-sm` | 12px / 0.75rem | 1.4 | 400 | 0 | Small code |

### 2.3 Typography Rules

1. **Headlines**: Always use `font-weight: 600`, negative letter-spacing
2. **Body**: Use `font-weight: 400`, default spacing
3. **Numbers**: Apply `font-variant-numeric: tabular-nums` for alignment
4. **Uppercase**: Only for captions/labels, always with `letter-spacing: 0.05em`
5. **Max line length**: 65-75 characters for readability

---

## 3. SPACING SYSTEM

### 3.1 Base Unit

Base: **4px**
All spacing derives from this unit.

### 3.2 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps, icon padding |
| `--space-2` | 8px | Small gaps, inline spacing |
| `--space-3` | 12px | Default gaps, small padding |
| `--space-4` | 16px | Standard padding, gaps |
| `--space-5` | 20px | Medium padding |
| `--space-6` | 24px | Card padding, section gaps |
| `--space-8` | 32px | Large gaps, component spacing |
| `--space-10` | 40px | Section padding |
| `--space-12` | 48px | Large section gaps |
| `--space-16` | 64px | Section vertical rhythm |
| `--space-20` | 80px | Major section spacing |
| `--space-24` | 96px | Hero spacing |
| `--space-32` | 128px | Full section padding |

### 3.3 Layout Grid

- **Max width**: 1200px (content), 1400px (full-bleed backgrounds)
- **Columns**: 12-column grid
- **Gutter**: 24px (desktop), 16px (tablet), 12px (mobile)
- **Margin**: 24px (desktop), 20px (tablet), 16px (mobile)

### 3.4 Section Rhythm

| Section Type | Top Padding | Bottom Padding |
|--------------|-------------|----------------|
| Hero | 128px | 96px |
| Primary section | 96px | 96px |
| Secondary section | 64px | 64px |
| Card section | 48px | 48px |

---

## 4. COMPONENT SPECIFICATIONS

### 4.1 Buttons

#### Primary Button
```
Background: --gradient-accent (emerald gradient)
Border: 1px solid rgba(16, 185, 129, 0.2)
Border Radius: 10px
Padding: 14px 28px
Font: --body-md, weight 500
Color: #ffffff
Shadow: 0 0 20px rgba(4, 120, 87, 0.25)

Hover:
  - Background shifts 10% lighter
  - Shadow expands: 0 0 30px rgba(4, 120, 87, 0.35)
  - Transform: translateY(-1px)

Active:
  - Transform: translateY(0) scale(0.98)
  - Shadow compresses

Disabled:
  - Background: --bg-tertiary
  - Color: --text-muted
  - No shadow
```

#### Secondary Button
```
Background: transparent
Border: 1px solid --border-default
Border Radius: 10px
Padding: 14px 28px
Font: --body-md, weight 500
Color: --text-secondary

Hover:
  - Background: --bg-tertiary
  - Border: --border-emphasis
  - Color: --text-primary

Active:
  - Transform: scale(0.98)
```

#### Ghost Button
```
Background: transparent
Border: none
Padding: 10px 16px
Font: --body-sm, weight 500
Color: --text-tertiary

Hover:
  - Color: --text-primary
  - Background: rgba(255, 255, 255, 0.03)
```

### 4.2 Cards

#### Standard Card
```
Background: --bg-secondary
Border: 1px solid --border-subtle
Border Radius: 16px
Padding: 24px
Inner highlight: --gradient-surface (top edge shine)

Hover:
  - Border: --border-default
  - Transform: translateY(-2px)
  - Shadow: 0 8px 32px rgba(0, 0, 0, 0.3)
```

#### Glass Card (Featured)
```
Background: rgba(12, 12, 16, 0.6)
Backdrop Filter: blur(20px)
Border: 1px solid rgba(255, 255, 255, 0.06)
Border Radius: 20px
Padding: 32px
Inner highlight: linear-gradient to bottom, white 5% opacity at top

Hover:
  - Border: rgba(4, 120, 87, 0.2) (subtle emerald tint)
  - Shadow: 0 0 40px rgba(4, 120, 87, 0.1)
```

#### Stat Card
```
Background: --bg-secondary
Border: 1px solid --border-subtle
Border Radius: 12px
Padding: 20px 24px
Text alignment: center

Number:
  - Font: --display-md
  - Color: --text-primary
  - Weight: 600

Label:
  - Font: --caption, uppercase
  - Color: --text-tertiary
  - Letter spacing: 0.05em
```

### 4.3 Navigation

#### Header
```
Background: rgba(6, 6, 8, 0.8)
Backdrop Filter: blur(12px)
Border Bottom: 1px solid --border-subtle
Height: 72px
Padding: 0 24px
Position: fixed, top 0
Z-index: 100

On scroll (past 50px):
  - Background opacity increases to 0.95
  - Border becomes slightly more visible
```

#### Nav Links
```
Font: --body-sm, weight 500
Color: --text-tertiary
Padding: 8px 16px
Border Radius: 8px

Hover:
  - Color: --text-primary
  - Background: rgba(255, 255, 255, 0.03)

Active:
  - Color: --emerald-400
  - Background: rgba(4, 120, 87, 0.1)
```

### 4.4 Inputs

```
Background: --bg-tertiary
Border: 1px solid --border-default
Border Radius: 10px
Padding: 14px 16px
Font: --body-md
Color: --text-primary
Placeholder: --text-muted

Focus:
  - Border: --emerald-700
  - Shadow: 0 0 0 3px rgba(4, 120, 87, 0.1)

Error:
  - Border: --error
  - Shadow: 0 0 0 3px rgba(220, 38, 38, 0.1)
```

### 4.5 Stats Block (Hero)

```
Layout: 3-column grid, 80px gap
Alignment: center

Each stat:
  Number:
    - Font: --display-lg (56px)
    - Color: --text-primary
    - Weight: 600
    - Subtle glow: 0 0 40px rgba(4, 120, 87, 0.15)

  Label:
    - Font: --caption, uppercase
    - Color: --text-tertiary
    - Margin top: 8px
    - Letter spacing: 0.08em
```

---

## 5. MOTION PRINCIPLES

### 5.1 Core Philosophy

- **Purposeful**: Animation guides attention, never distracts
- **Swift**: Fast enough to feel responsive (200-400ms typical)
- **Natural**: Use spring physics for organic feel
- **Restrained**: Subtle movements over dramatic ones

### 5.2 Timing

| Type | Duration | Easing |
|------|----------|--------|
| Micro (hover, focus) | 150-200ms | ease-out |
| Standard (reveals) | 300-400ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Emphasis (hero) | 500-600ms | spring(1, 80, 10) |
| Background (ambient) | 20-30s | linear (looped) |

### 5.3 What Animates

| Element | Animation | Trigger |
|---------|-----------|---------|
| Hero headline | Fade up + blur clear | Page load |
| Hero stats | Staggered fade up | Page load (0.1s delay each) |
| Stat numbers | Spring count-up | In view |
| Cards | Fade up | Scroll into view |
| Buttons | Scale + shadow | Hover/press |
| Card borders | Opacity increase | Hover |
| Background gradient | Slow position drift | Ambient (continuous) |
| Section dividers | Width expand | Scroll into view |

### 5.4 What Does NOT Animate

- Text color changes (instant)
- Background color changes (instant or 150ms max)
- Layout shifts
- Scroll position
- Typography properties

### 5.5 Animation Specifications

**Page Load Sequence**
```
1. Background gradient fades in (0-300ms)
2. Navigation slides down (100-400ms)
3. Hero headline fades up from y:30 (200-700ms)
4. Hero subtext fades up (400-800ms)
5. CTA buttons fade up (500-900ms)
6. Stats fade up staggered (600-1100ms)
```

**Scroll Reveal**
```
Initial: opacity 0, y: 20px
Final: opacity 1, y: 0
Duration: 400ms
Easing: cubic-bezier(0.16, 1, 0.3, 1)
Trigger: element 20% in viewport
```

**Hover Lift (Cards)**
```
Transform: translateY(-2px)
Shadow: expand by 50%
Duration: 200ms
Easing: ease-out
```

---

## 6. SIGNATURE VISUAL IDENTITY

### 6.1 The ONE Element: Atmospheric Glow

**Concept**: A subtle, living emerald glow that emanates from the top of the page — like northern lights filtered through dark glass. This glow is the signature. It's always present but never overwhelming.

**Implementation**:
```css
.atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;

  background:
    /* Primary emerald glow - top center */
    radial-gradient(
      ellipse 60% 40% at 50% -10%,
      rgba(4, 120, 87, 0.12) 0%,
      transparent 70%
    ),
    /* Secondary violet depth - top right */
    radial-gradient(
      ellipse 40% 30% at 80% 0%,
      rgba(109, 40, 217, 0.06) 0%,
      transparent 60%
    ),
    /* Tertiary glow - top left */
    radial-gradient(
      ellipse 35% 25% at 20% 5%,
      rgba(4, 120, 87, 0.05) 0%,
      transparent 50%
    ),
    /* Base */
    #060608;

  animation: atmosphere-drift 25s ease-in-out infinite alternate;
}

@keyframes atmosphere-drift {
  0% {
    background-position: 50% 0%, 80% 0%, 20% 0%, 0% 0%;
  }
  100% {
    background-position: 45% 5%, 75% -5%, 25% 3%, 0% 0%;
  }
}
```

**Rules**:
- Maximum emerald opacity: 12%
- Maximum violet opacity: 6%
- Animation is slow (25s+) and subtle
- Glow only at top of page, fading to pure dark by 40% viewport height
- No glow on individual components — atmosphere is page-level only

### 6.2 Supporting Texture

**Subtle noise overlay** for depth:
```css
.noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1000;
  opacity: 0.015;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  mix-blend-mode: overlay;
}
```

---

## 7. IMPLEMENTATION CHECKLIST

### Phase 1: Foundation
- [ ] Update CSS variables with new color tokens
- [ ] Replace font stack with Geist
- [ ] Update spacing scale in Tailwind config
- [ ] Add atmospheric background component

### Phase 2: Hero Section
- [ ] Apply new typography scale to headline
- [ ] Implement staggered entrance animation
- [ ] Update stats block with new design
- [ ] Refine CTA buttons

### Phase 3: Components
- [ ] Update Button component with new styles
- [ ] Update Card component with glass/standard variants
- [ ] Update Input styles
- [ ] Update Navigation with blur effect

### Phase 4: Sections
- [ ] Apply section spacing rhythm
- [ ] Add scroll-triggered reveals
- [ ] Update divider styling
- [ ] Refine footer

### Phase 5: Polish
- [ ] Add noise texture overlay
- [ ] Fine-tune animation timing
- [ ] Responsive adjustments
- [ ] Performance optimization

---

## 8. DO NOT LIST

These elements are explicitly forbidden:

- Neon colors (saturated greens, pinks, cyans)
- Rainbow gradients or multi-color gradients
- Glow effects on individual components (glow is atmosphere only)
- Animated borders or "breathing" effects
- Particle systems or confetti (except one-time success states)
- Skeuomorphic shadows or 3D effects
- Rounded corners greater than 20px
- Decorative icons or illustrations
- Background patterns (grids, dots) — only noise texture
- Animated text or typing effects
- Scroll-jacking or parallax
- Loading spinners with color (use opacity pulse only)

---

## 9. EXAMPLE: HERO SECTION SPEC

```
┌─────────────────────────────────────────────────────────────┐
│                     [ATMOSPHERIC GLOW]                      │
│                                                             │
│                                                             │
│                        Earn SOL for                         │  ← --display-xl, --text-primary
│                     Driving Attention                       │  ← same, slight emerald tint allowed
│                                                             │
│         Post about $ATTN. Get rewarded based on real        │  ← --body-lg, --text-secondary
│           engagement. Quality content. Direct payouts.      │
│                                                             │
│              ┌──────────────┐   ┌──────────────┐           │
│              │  Dashboard → │   │  How It Works │           │  ← Primary / Secondary buttons
│              └──────────────┘   └──────────────┘           │
│                                                             │
│         ┌─────────┐    ┌─────────┐    ┌─────────┐         │
│         │  127    │    │   842   │    │   50    │         │  ← Stat numbers
│         │SOL Paid │    │ Creators│    │Pool SOL │         │  ← Stat labels
│         └─────────┘    └─────────┘    └─────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Spacing**:
- Top padding: 128px
- Headline to subtext: 24px
- Subtext to buttons: 40px
- Buttons to stats: 64px
- Stats grid gap: 80px
- Bottom padding: 96px

---

**Document Version**: 2.0
**Last Updated**: January 2026
**Status**: PENDING APPROVAL

---

*Awaiting approval before implementation begins.*
