import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatUptime(milliseconds) {
  if (!milliseconds || milliseconds < 0) return 'N/A';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleString();
}

export function getStatusColor(status) {
  const colors = {
    healthy: 'text-neon-green',
    warning: 'text-neon-yellow',
    critical: 'text-neon-red',
    analyzing: 'text-blue-400',
    unknown: 'text-gray-500'
  };
  return colors[status] || colors.unknown;
}

export function getStatusGlow(status) {
  const glows = {
    healthy: 'glow-green',
    warning: 'glow-yellow',
    critical: 'glow-red',
    analyzing: 'glow-blue',
    unknown: ''
  };
  return glows[status] || '';
}

export function getStatusIcon(status) {
  const icons = {
    healthy: '🟢',
    warning: '🟡',
    critical: '🔴',
    analyzing: '🔵',
    unknown: '⚪'
  };
  return icons[status] || icons.unknown;
}

export function getTrendIcon(trend) {
  const icons = {
    rising: '↗',
    falling: '↘',
    stable: '→'
  };
  return icons[trend] || '→';
}
