export function numberOfDays(days: number): string {
  return pluralize(days, 'day');
}

export function pluralize(value: number, word: string, plural?: string) {
  if (value == 1) {
    return `1 ${word}`;
  } else {
    plural = plural ?? `${word}s`;
    return `${value} ${plural}`;
  }
}

export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  } else {
    return text.slice(0, maxLen - 1) + '…';
  }
}
