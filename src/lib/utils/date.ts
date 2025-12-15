/* Format date in format YYYY-MM-DD HH:MM: */
export function formatDate(timestamp: Date): string {
  const date = timestamp;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Format a date into relative human-readable text
 * @param date - The date to format
 * @param options - Optional configuration
 * @returns Human-readable date string
 */
export function formatRelativeDate(
  date: Date | string | null | undefined,
  options: {
    includePast?: boolean;
    capitalizeFirst?: boolean;
  } = {}
): string {
  if (!date) return '';

  const { includePast = true, capitalizeFirst = true } = options;

  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  // Reset hours to compare dates only
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  // Calculate difference in days
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let result = '';

  // Today
  if (diffDays === 0) {
    result = 'today';
  }
  // Yesterday
  else if (diffDays === -1 && includePast) {
    result = 'yesterday';
  }
  // Tomorrow
  else if (diffDays === 1) {
    result = 'tomorrow';
  }
  // Past (2-6 days ago)
  else if (diffDays < 0 && diffDays >= -6 && includePast) {
    result = `${Math.abs(diffDays)} days ago`;
  }
  // Past (weeks ago)
  else if (diffDays < -6 && diffDays >= -60 && includePast) {
    const weeks = Math.abs(Math.round(diffDays / 7));
    result = weeks === 1 ? 'last week' : `${weeks} weeks ago`;
  }
  // Past (months ago)
  else if (diffDays < -60 && diffDays >= -365 && includePast) {
    const months = Math.abs(Math.round(diffDays / 30));
    result = months === 1 ? 'last month' : `${months} months ago`;
  }
  // Past (years ago)
  else if (diffDays < -365 && includePast) {
    const years = Math.abs(Math.round(diffDays / 365));
    result = years === 1 ? 'last year' : `${years} years ago`;
  }
  // Future (2-6 days)
  else if (diffDays > 1 && diffDays <= 6) {
    result = `in ${diffDays} days`;
  }
  // Future (weeks)
  else if (diffDays > 6 && diffDays <= 60) {
    const weeks = Math.round(diffDays / 7);
    result = weeks === 1 ? 'next week' : `in ${weeks} weeks`;
  }
  // Future (months)
  else if (diffDays > 60 && diffDays <= 365) {
    const months = Math.round(diffDays / 30);
    result = months === 1 ? 'next month' : `in ${months} months`;
  }
  // Future (years)
  else if (diffDays > 365) {
    const years = Math.round(diffDays / 365);
    result = years === 1 ? 'next year' : `in ${years} years`;
  }

  // Capitalize first letter if requested
  if (capitalizeFirst && result) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}
