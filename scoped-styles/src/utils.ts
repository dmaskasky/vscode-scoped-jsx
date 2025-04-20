export function addEventListener<T extends EventTarget>(
  target: T,
  ...[type, listener, options]: Parameters<T["addEventListener"]>
) {
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
}

export function microtask() {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}
