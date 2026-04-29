export async function simulateLatency<T>(factory: () => T, delay = 180): Promise<T> {
    await new Promise(resolve => window.setTimeout(resolve, delay));
    return factory();
}
