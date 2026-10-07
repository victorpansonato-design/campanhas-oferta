let loader: (path: string) => void = () => {};
export function registerRoutePrefetch(prefetch: typeof loader) {
   loader = prefetch;
}
export function preloadRoute(path: string) {
   loader(path);
}
