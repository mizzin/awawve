// Minimal declaration to satisfy Google Maps JS API usage in client components.
// This is intentionally light-weight; runtime loads the script dynamically.
declare const google: any

declare global {
  interface Window {
    google?: any
  }
}
