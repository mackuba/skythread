export * from './utils/at_uri.js';
export * from './utils/avatar_preloader.js';
export * from './utils/text.js';

export function castToInt(value: any): number | null | undefined {
  if (value === undefined || value === null || typeof value == "number") {
    return value;
  } else {
    return parseInt(value, 10);
  }
}

export function feedPostTime(feedPost: json): number {
  let timestamp = feedPost.reason ? feedPost.reason.indexedAt : feedPost.post.record.createdAt;
  return Date.parse(timestamp);
}

export function isValidURL(url: string): boolean {
  try {
    let u = new URL(url);
    return (u.protocol == 'http:' || u.protocol == 'https:');
  } catch (error) {
    console.error("Invalid URL: " + error);
    return false;
  }
}

export function sameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() == date2.getDate() &&
    date1.getMonth() == date2.getMonth() &&
    date1.getFullYear() == date2.getFullYear()
  );
}

export function showError(error: Error) {
  console.log(error);
  alert(error);
}
