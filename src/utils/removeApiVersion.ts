export function removeApiVersion(url: string): string {
  return url.replace(/\/v1\/?$/, '');
}