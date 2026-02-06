import { lightenHexColor } from '$lib/utils/hugin-utils';

export function generateMonochromaticColorTheme(accent) {
  return {
    accent,
    accentForeground: lightenHexColor(accent, 80),
    background: accent,
    border: lightenHexColor(accent, 10),
    card: lightenHexColor(accent, 10),
    cardForeground: lightenHexColor(accent, 8),
    // destructive: lightenHexColor(accent, -20),
    // destructiveForeground: lightenHexColor(accent, 60),
    foreground: lightenHexColor(accent, 80),
    input: lightenHexColor(accent, 50),
    muted: lightenHexColor(accent, 40),
    mutedForeground: lightenHexColor(accent, 80),
    popover: lightenHexColor(accent, 35),
    popoverForeground: lightenHexColor(accent, 80),
    primary: lightenHexColor(accent, 80),
    primaryForeground: lightenHexColor(accent, -30),
    secondary: lightenHexColor(accent, 70),
    secondaryForeground: lightenHexColor(accent, -30),
    mode: 'color',
  };
}


// Shared base colors
const sharedColors = {
  light: {
    background: '#ffffff',
    border: '#e5e5e5',
    card: lightenHexColor('#ffffff', -4),
    cardForeground: '#0a0a0a',
    destructive: '#dc2626',
    destructiveForeground: '#fafafa',
    foreground: '#0a0a0a',
    input: '#e5e5e5',
    mode: 'light',
    muted: '#f5f5f5',
    mutedForeground: '#737373',
    popover: '#ffffff',
    popoverForeground: '#0a0a0a',
  },
  dark: {
    background: '#000000',
    border: lightenHexColor('#000000'),
    card: '#141414',
    cardForeground: '#a3a3a3',
    destructive: '#dc2626',
    destructiveForeground: '#fafafa',
    foreground: '#fafafa',
    input: '#262626',
    mode: 'dark',
    muted: '#262626',
    mutedForeground: '#a3a3a3',
    popover: '#000000',
    popoverForeground: '#fafafa',
  },
  color: {
    background: '#ffffff',
    border: '#fafafa',
    card: '#ffffff',
    cardForeground: '#222222',
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',
    foreground: '#222222',
    input: '#f5f5f5',
    mode: 'color',
    muted: '#fafafa',
    mutedForeground: '#444444',
    popover: '#ffffff',
    popoverForeground: '#222222',
  },
};

// Shared base theme builder
const baseTheme = (mode) => ({
  ...sharedColors[mode],
});

// Utility function to construct a theme with overrides
const createTheme = (
  name,
  overrides
) => ({
  dark: {
    ...baseTheme('dark'),
    name,
    ...overrides.dark,
  },
  light: {
    ...baseTheme('light'),
    name,
    ...overrides.light,
  },
  color: {
  ...baseTheme('color'),
  name,
  ...overrides.color,
},
});

const aesir = createTheme('aesir', {
  dark: {
    accent: 'rgb(28, 38, 44)',
    accentForeground: '#FAFBFB',
    primary: '#5a8bdb',
    primaryForeground: 'rgb(28, 6, 22)',
    secondary: 'rgb(28, 38, 44)',
    secondaryForeground: '#FAFBFB',
  },
  light: {
    accent: 'rgb(230, 232, 237)',
    accentForeground: 'rgb(28, 6, 22)',
    primary: 'rgb(37, 102, 231)',
    primaryForeground: '#FAFBFB',
    secondary: 'rgb(230, 232, 237)',
    secondaryForeground: 'rgb(28, 6, 22)',
  },
  color: generateMonochromaticColorTheme('#1C4CE1')
});

const neutral = createTheme('neutral', {
  dark: {
    accent: '#262626',
    accentForeground: '#fafafa',
    primary: '#fafafa',
    primaryForeground: '#171717',
    secondary: '#474747',
    secondaryForeground: '#fafafa',
  },
  light: {
    accent: '#f5f5f5',
    accentForeground: '#171717',
    primary: '#171717',
    primaryForeground: '#fafafa',
    secondary: '#f5f5f5',
    secondaryForeground: '#171717',
  },
  color: generateMonochromaticColorTheme('#262626')
});

const stonks = createTheme('stonks', {
  dark: {
    accent: '#261C1C',
    accentForeground: '#FAFBFB',
    primary: '#FBCB14',
    primaryForeground: '#421F05',
    secondary: '#261C1C',
    secondaryForeground: '#FAFBFB',
  },
  light: {
    accent: '#F4F4F8',
    accentForeground: '#1C1917',
    primary: '#FFA005',
    primaryForeground: '#481400',
    secondary: '#F4F4F8',
    secondaryForeground: '#1C1917',
  },
  color: generateMonochromaticColorTheme('#FFA005')
});

const blush = createTheme('blush', {
  dark: {
    accent: '#BE123C',
    accentForeground: '#FFF1F2',
    primary: '#F472B6',
    primaryForeground: '#3E0611',
    secondary: '#3B0211',
    secondaryForeground: '#FFF1F2',
  },
  light: {
    accent: '#FFE4E6',
    accentForeground: '#3B0211',
    primary: '#EC4899',
    primaryForeground: '#FFFFFF',
    secondary: '#FECDD3',
    secondaryForeground: '#3B0211',
  },
  color: generateMonochromaticColorTheme('#EC4899')
});

const amethyst = createTheme('amethyst', {
  dark: {
    accent: '#5D3FD3',
    accentForeground: '#F4F0FF',
    primary: '#9B5DE5',
    primaryForeground: '#1B0B3A',
    secondary: '#2A1E5C',
    secondaryForeground: '#F4F0FF',
  },
  light: {
    accent: '#E5D8FF',
    accentForeground: '#1B0B3A',
    primary: '#5D3FD3',
    primaryForeground: '#FFFFFF',
    secondary: '#F0E6FF',
    secondaryForeground: '#1B0B3A',
  },
  color: generateMonochromaticColorTheme('#9B5DE5')
});

const forest = createTheme('forest', {
  dark: {
    accent: '#1B4332',
    accentForeground: '#D8F3DC',
    primary: '#2D6A4F',
    primaryForeground: '#EFF6E0',
    secondary: '#081C15',
    secondaryForeground: '#D8F3DC',
  },
  light: {
    accent: '#D8F3DC',
    accentForeground: '#081C15',
    primary: '#40916C',
    primaryForeground: '#FFFFFF',
    secondary: '#B7E4C7',
    secondaryForeground: '#081C15',
  },
  color: generateMonochromaticColorTheme('#2D6A4F')

});

const crimson = createTheme('crimson', {
  dark: {
    accent: '#7F1D1D',
    accentForeground: '#FEE2E2',
    primary: '#DC2626',
    primaryForeground: '#FFF5F5',
    secondary: '#450A0A',
    secondaryForeground: '#FEE2E2',
  },
  light: {
    accent: '#FEE2E2',
    accentForeground: '#450A0A',
    primary: '#DC2626',
    primaryForeground: '#FFFFFF',
    secondary: '#FCA5A5',
    secondaryForeground: '#450A0A',
  },
  color: generateMonochromaticColorTheme('#DC2626'),
});

const military = createTheme('military', {
  dark: {
    accent: '#3A4D39',
    accentForeground: '#E5F4E3',
    primary: '#5C745D',
    primaryForeground: '#EFFAE9',
    secondary: '#1C251B',
    secondaryForeground: '#D2E4D0',
  },
  light: {
    accent: '#E5F4E3',
    accentForeground: '#1C251B',
    primary: '#5C745D',
    primaryForeground: '#FFFFFF',
    secondary: '#D2E4D0',
    secondaryForeground: '#1C251B',
  },
  color: generateMonochromaticColorTheme('#5D6532'),
});

const navy = createTheme('navy', {
  dark: {
    accent: '#1E3A8A',
    accentForeground: '#DBEAFE',
    primary: '#3B82F6',
    primaryForeground: '#E0F2FE',
    secondary: '#172554',
    secondaryForeground: '#DBEAFE',
  },
  light: {
    accent: '#DBEAFE',
    accentForeground: '#172554',
    primary: '#2563EB',
    primaryForeground: '#FFFFFF',
    secondary: '#BFDBFE',
    secondaryForeground: '#172554',
  },
  color: generateMonochromaticColorTheme('#3B82F6'),
});

const frost = createTheme('frost', {
  dark: {
    accent: '#CBD5E1', // Light slate gray
    accentForeground: '#0F172A',
    primary: '#E2E8F0',
    primaryForeground: '#0F172A',
    secondary: '#94A3B8',
    secondaryForeground: '#0F172A',
  },
  light: {
    accent: '#F8FAFC', // Icy white
    accentForeground: '#0F172A',
    primary: '#CBD5E1',
    primaryForeground: '#0F172A',
    secondary: '#E2E8F0',
    secondaryForeground: '#0F172A',
  },
  color: generateMonochromaticColorTheme(lightenHexColor('#CBD5E1', -20)), // frosty slate
});

const evergreen = createTheme('evergreen', {
  dark: {
    accent: '#1A3B2A', // Deep evergreen
    accentForeground: '#D1FAE5',
    primary: '#2F523C',
    primaryForeground: '#F0FFF4',
    secondary: '#0F2418',
    secondaryForeground: '#D1FAE5',
  },
  light: {
    accent: '#D1FAE5', // Soft mint green
    accentForeground: '#0F2418',
    primary: '#2F523C',
    primaryForeground: '#F0FFF4',
    secondary: '#A7F3D0',
    secondaryForeground: '#0F2418',
  },
  color: generateMonochromaticColorTheme('#2F523C'), // Evergreen base
});

const steel = createTheme('steel', {
  dark: {
    accent: '#2E2E32', // Gunmetal steel
    accentForeground: '#E4E4E7',
    primary: '#44444C',
    primaryForeground: '#FAFAFA',
    secondary: '#1F1F23',
    secondaryForeground: '#E4E4E7',
  },
  light: {
    accent: '#E4E4E7', // Light steel
    accentForeground: '#1F1F23',
    primary: '#6B7280',
    primaryForeground: '#FFFFFF',
    secondary: '#D4D4D8',
    secondaryForeground: '#1F1F23',
  },
  color: generateMonochromaticColorTheme(lightenHexColor('#44444C', 20)), // Steel base
});

const blonde = createTheme('blonde', {
  dark: {
    accent: '#9E8F71', // Muted ash blonde
    accentForeground: '#FAF9F6',
    primary: '#B8A78C',
    primaryForeground: '#1C1915',
    secondary: '#7A6F5A',
    secondaryForeground: '#F5F3ED',
  },
  light: {
    accent: '#F5F3ED', // Very light ash blonde
    accentForeground: '#3E372C',
    primary: '#CBBFA8',
    primaryForeground: '#1C1915',
    secondary: '#E8E1D6',
    secondaryForeground: '#3E372C',
  },
  color: generateMonochromaticColorTheme('#B8A78C'), // Ashy blonde base
});

const watermelon = createTheme('watermelon', {
  dark: {
    accent: '#700F2B', // Darker watermelon flesh
    accentForeground: '#FFEDEF',
    primary: '#A0153E', // Base accent
    primaryForeground: '#FFF6F7',
    secondary: '#4D0B1E', // Almost black cherry
    secondaryForeground: '#FFDDE4',
  },
  light: {
    accent: '#FFA3B5', // Soft flesh tone
    accentForeground: '#3E0A15',
    primary: '#A0153E',
    primaryForeground: '#FFF6F7',
    secondary: '#FFD7E1',
    secondaryForeground: '#3E0A15',
  },
  color: generateMonochromaticColorTheme('#A0153E'),
});

const mist = createTheme('mist', {
  dark: {
    accent: '#5F8989', // Muted teal-gray
    accentForeground: '#EFF8F8',
    primary: '#A6D6D6', // Base accent
    primaryForeground: '#0A1A1A',
    secondary: '#3C5A5A', // Shadowed teal
    secondaryForeground: '#EFF8F8',
  },
  light: {
    accent: '#E6F4F4', // Soft sky fog
    accentForeground: '#1A2C2C',
    primary: '#A6D6D6',
    primaryForeground: '#0A1A1A',
    secondary: '#D2EAEA',
    secondaryForeground: '#1A2C2C',
  },
  color: generateMonochromaticColorTheme('#A6D6D6'),
});

// Export all themes
export const themes = {
  aesir,
  navy,
  mist,
  neutral,
  frost,
  steel,
  blonde,
  stonks,
  blush,
  amethyst,
  crimson,
  watermelon,
  forest,
  military,
  evergreen,
};

export const defaultTheme = neutral;
export const defaultThemeName = 'neutral';
