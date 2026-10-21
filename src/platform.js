// Small SDK boundary. A hosting platform can subscribe without changing gameplay.
// No platform SDK is downloaded until a real portal integration is selected.
export const platform = {
  ready() { this.event('ready'); },
  start() { this.event('gameplay-start'); },
  stop() { this.event('gameplay-stop'); },
  complete(detail) { this.event('level-complete', detail); },
  event(name, detail = {}) { window.dispatchEvent(new CustomEvent(`kva:${name}`, { detail })); }
};
