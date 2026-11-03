// Browser asset loader for the WASM engine. Fetches `hama.wasm` and `.hama`
// weight packages relative to the built module (override via explicit URLs).
const assetUrl = (asset) => new URL(`./assets/${asset}`, import.meta.url).toString();
export async function loadWasm() {
    const res = await fetch(assetUrl("hama.wasm"));
    return new Uint8Array(await res.arrayBuffer());
}
export async function resolveModelBytes(url, asset) {
    const res = await fetch(url ?? assetUrl(asset));
    return new Uint8Array(await res.arrayBuffer());
}
//# sourceMappingURL=engine.browser.js.map