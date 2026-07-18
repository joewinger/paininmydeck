export function faviconPathForMode(mode: string): string {
  switch (mode) {
    case 'development':
      return '/favicon-development.svg';
    case 'staging':
      return '/favicon-staging.svg';
    default:
      return '/favicon.svg';
  }
}
