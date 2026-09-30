import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export interface ChartColors {
  accent: string;
  critical: string;
  high: string;
  medium: string;
  low: string;
  info: string;
  success: string;
  text2: string;
  text3: string;
  line: string;
  surface: string;
}

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Reads design-token colors as rgb() strings so Recharts can consume them. */
export function useChartColors(): ChartColors {
  const { theme } = useTheme();

  return useMemo(() => {
    const read = (name: string) => `rgb(${readVar(name)})`;
    return {
      accent: read('--c-accent'),
      critical: read('--sev-critical'),
      high: read('--sev-high'),
      medium: read('--sev-medium'),
      low: read('--sev-low'),
      info: read('--sev-info'),
      success: read('--c-success'),
      text2: read('--c-text-2'),
      text3: read('--c-text-3'),
      line: read('--c-border'),
      surface: read('--c-surface-2'),
    };
  }, [theme]);
}

export function severityColor(severity: string, colors: ChartColors): string {
  switch (severity) {
    case 'critical':
      return colors.critical;
    case 'high':
      return colors.high;
    case 'medium':
      return colors.medium;
    case 'low':
      return colors.low;
    default:
      return colors.info;
  }
}
