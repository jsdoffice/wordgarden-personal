import vocabData from "./assets/g2p_vocab.json";
import p2gVocabData from "./assets/p2g_vocab.json";
import { ASR_OUTPUT_FRAME_SAMPLES, ctcPhonemeSpans } from "./ctc.js";
export { ctcPhonemeSpans, ASR_OUTPUT_FRAME_SAMPLES } from "./ctc.js";
import { ASR_VOCAB, HamaEngine } from "./engine.js";
import { loadWasm, resolveModelBytes } from "./engine.browser.js";
import { decodeP2GOutput, normalizePhonemeTokens } from "./p2g-text.js";
import { buildDisplayIpa, decodeIdsToResult, decoderIds, encodeText, prepareTextForPrediction, } from "./tokenizer.js";
import { pronunciationReplaceWithModel, pronunciationScanWithModel, } from "./pronunciation.js";
let defaultPronunciationBrowserModelPromise = null;
let browserEnginePromise = null;
const getBrowserEngine = () => {
    if (browserEnginePromise == null)
        browserEnginePromise = loadWasm().then((w) => HamaEngine.fromBytes(w));
    return browserEnginePromise;
};
export const decodeCtcTokens = (frameTokenIds, decoderTokens, options) => {
    const collapseRepeats = options.collapseRepeats ?? true;
    const tokenIds = [];
    let prev = -1;
    for (const tokenId of frameTokenIds) {
        if (collapseRepeats && tokenId === prev) {
            continue;
        }
        prev = tokenId;
        if (tokenId === options.blankId) {
            continue;
        }
        tokenIds.push(tokenId);
    }
    const rawTokens = tokenIds.map((tokenId) => decoderTokens[tokenId] ?? "<unk>");
    const phonemes = rawTokens.filter((token) => token !== options.wordBoundaryToken);
    const words = [];
    let current = [];
    for (const token of rawTokens) {
        if (token === options.wordBoundaryToken) {
            if (current.length > 0) {
                words.push(current);
                current = [];
            }
            continue;
        }
        current.push(token);
    }
    if (current.length > 0) {
        words.push(current);
    }
    return { tokenIds, phonemes, words };
};
const loadDecoderTokens = async (vocabUrl) => {
    let vocab;
    if (vocabUrl) {
        const response = await fetch(vocabUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ASR vocab: ${response.status} ${response.statusText}`);
        }
        vocab = await response.json();
    }
    else {
        vocab = vocabData;
    }
    if (!Array.isArray(vocab.decoder) || vocab.decoder.length === 0) {
        throw new Error("Invalid vocabulary JSON: missing decoder token list");
    }
    return [...vocab.decoder, "<wb>", "<blank>"];
};
export class G2PBrowserModel {
    constructor(engine, encHandle, decHandle, options) {
        this.engine = engine;
        this.encHandle = encHandle;
        this.decHandle = decHandle;
        this.options = options;
    }
    static async create(options = {}) {
        if ((options.encoderUrl === undefined) !== (options.decoderStepUrl === undefined)) {
            throw new Error("encoderUrl and decoderStepUrl must be provided together");
        }
        const opts = {
            modelUrl: options.modelUrl ?? "",
            encoderUrl: options.encoderUrl ?? "",
            decoderStepUrl: options.decoderStepUrl ?? "",
            maxInputLen: options.maxInputLen ?? 128,
            maxOutputLen: options.maxOutputLen ?? 32,
        };
        const engine = await getBrowserEngine();
        const [encBytes, decBytes] = await Promise.all([
            resolveModelBytes(options.encoderUrl, "encoder.hama"),
            resolveModelBytes(options.decoderStepUrl, "decoder_step.hama"),
        ]);
        return new G2PBrowserModel(engine, engine.loadEncoder(encBytes), engine.loadDecoder(decBytes), opts);
    }
    async predict(text, options = {}) {
        const splitDelimiter = options.splitDelimiter ?? /\s+/u;
        const outputDelimiter = options.outputDelimiter ?? " ";
        const preserveLiterals = options.preserveLiterals ?? "none";
        const segments = splitSegments(text, splitDelimiter);
        if (segments.length === 0) {
            return this.predictSingle(text, 0, preserveLiterals);
        }
        const results = await Promise.all(segments.map(async (segment) => this.predictSingle(segment.text, codePointOffset(text, segment.startCodeUnit), preserveLiterals)));
        const ipaParts = [];
        const displayParts = [];
        const alignments = [];
        for (let i = 0; i < results.length; i++) {
            if (i > 0)
                ipaParts.push(outputDelimiter);
            if (i > 0)
                displayParts.push(outputDelimiter);
            ipaParts.push(results[i].ipa);
            displayParts.push(results[i].displayIpa);
            for (const alignment of results[i].alignments) {
                alignments.push({
                    phoneme: alignment.phoneme,
                    phonemeIndex: alignments.length,
                    charIndex: alignment.charIndex,
                });
            }
        }
        return { ipa: ipaParts.join(""), displayIpa: displayParts.join(""), alignments };
    }
    async pronunciationScan(text, terms, options = {}) {
        return pronunciationScanWithModel(this, text, terms, options);
    }
    async pronunciationReplace(text, terms, options = {}) {
        return pronunciationReplaceWithModel(this, text, terms, options);
    }
    getMaxInputLen() {
        return this.options.maxInputLen;
    }
    async predictSingle(text, baseCharIndex, preserveLiterals) {
        const prepared = prepareTextForPrediction(text, preserveLiterals);
        if (preserveLiterals === "punct" && !/\S/u.test(prepared.modelText)) {
            return {
                ipa: "",
                displayIpa: Array.from(text).filter((ch) => /\p{P}/u.test(ch)).join(""),
                alignments: [],
            };
        }
        return this.predictSingleSplit(prepared.modelText, text, prepared.charIndexMap, baseCharIndex, preserveLiterals);
    }
    predictSingleSplit(text, originalText, charIndexMap, baseCharIndex, preserveLiterals) {
        const encoded = encodeText(text, this.options.maxInputLen);
        const inputIds = BigInt64Array.from(encoded.ids);
        const enc = this.engine.encoderRun(this.encHandle, inputIds, encoded.length || 1);
        const positions = new Float32Array(enc.T);
        for (let i = 0; i < enc.T; i++)
            positions[i] = i;
        let hidden = enc.hidden;
        let prevAttn = enc.prevAttn;
        let token = decoderIds.sos;
        const decoded = [];
        const attnIndices = [];
        for (let step = 0; step < this.options.maxOutputLen; step++) {
            const out = this.engine.decoderStep(this.decHandle, token, enc.encoderOutputs, enc.projectedKeys, enc.mask, prevAttn, hidden, positions);
            decoded.push(out.nextToken);
            attnIndices.push(out.attnArgmax);
            hidden = out.hiddenOut;
            prevAttn = out.prevOut;
            token = out.nextToken;
            if (token === decoderIds.eos)
                break;
        }
        const rawResult = decodeIdsToResult(decoded, attnIndices, encoded.positionMap);
        const relativeAlignments = rawResult.alignments.map((alignment, idx) => ({
            phoneme: alignment.phoneme,
            phonemeIndex: idx,
            charIndex: alignment.charIndex >= 0 && alignment.charIndex < charIndexMap.length
                ? charIndexMap[alignment.charIndex]
                : -1,
        }));
        return {
            ipa: rawResult.ipa,
            displayIpa: preserveLiterals === "punct"
                ? buildDisplayIpa(rawResult.ipa, relativeAlignments, originalText)
                : rawResult.ipa,
            alignments: relativeAlignments.map((alignment, idx) => ({
                phoneme: alignment.phoneme,
                phonemeIndex: idx,
                charIndex: alignment.charIndex < 0 ? alignment.charIndex : alignment.charIndex + baseCharIndex,
            })),
        };
    }
}
export class ASRBrowserModel {
    constructor(engine, handle, decoderTokens, options) {
        this.engine = engine;
        this.handle = handle;
        this.sampleRate = options.sampleRate;
        this.wordBoundaryToken = options.wordBoundaryToken;
        this.temperature = options.temperature;
        this.blankBias = options.blankBias;
        this.unkBias = options.unkBias;
        this.collapseRepeats = options.collapseRepeats;
        this.decoderTokens = decoderTokens;
        this.blankId = this.decoderTokens.indexOf(options.blankToken);
        if (this.blankId < 0) {
            throw new Error(`blank token '${options.blankToken}' not found in decoder tokens`);
        }
        const unk = this.decoderTokens.indexOf(options.unkToken);
        this.unkId = unk >= 0 ? unk : null;
    }
    static async create(options = {}) {
        const engine = await getBrowserEngine();
        const [decoderTokens, modelBytes] = await Promise.all([
            loadDecoderTokens(options.vocabUrl),
            resolveModelBytes(options.modelUrl, "asr_waveform.hama"),
        ]);
        const handle = engine.loadAsr(modelBytes);
        return new ASRBrowserModel(engine, handle, decoderTokens, {
            sampleRate: options.sampleRate ?? 16000,
            blankToken: options.blankToken ?? "<blank>",
            unkToken: options.unkToken ?? "<unk>",
            wordBoundaryToken: options.wordBoundaryToken ?? "<wb>",
            temperature: options.temperature ?? 0.95,
            blankBias: options.blankBias ?? -0.1,
            unkBias: options.unkBias ?? 0.0,
            collapseRepeats: options.collapseRepeats ?? true,
        });
    }
    get inputFormat() {
        return "waveform";
    }
    async transcribeWaveform(waveform, sampleRate) {
        const mono = toFloat32Mono(waveform);
        const resampled = sampleRate === this.sampleRate
            ? mono
            : resampleLinear(mono, sampleRate, this.sampleRate);
        const { logProbs, T, outLength } = this.engine.asrRun(this.handle, resampled);
        const numFrames = Math.max(0, Math.min(outLength, T));
        const frameTokenIds = this.argmaxFrames(logProbs, numFrames);
        const decoded = decodeCtcTokens(frameTokenIds, this.decoderTokens, {
            blankId: this.blankId,
            wordBoundaryToken: this.wordBoundaryToken,
            collapseRepeats: this.collapseRepeats,
        });
        return {
            phonemes: decoded.phonemes,
            phonemeText: decoded.phonemes.join(" "),
            wordPhonemeText: decoded.words.map((word) => word.join(" ")).join(" | "),
            tokenIds: decoded.tokenIds,
            frameTokenIds,
            numFrames,
        };
    }
    /** Approximate per-phoneme time spans (ms) from an ASRResult. */
    phonemeSpans(result) {
        return ctcPhonemeSpans(result.frameTokenIds, this.decoderTokens, {
            blankId: this.blankId,
            wordBoundaryToken: this.wordBoundaryToken,
            frameMs: (1000 * ASR_OUTPUT_FRAME_SAMPLES) / this.sampleRate,
            collapseRepeats: this.collapseRepeats,
        });
    }
    argmaxFrames(logProbs, numFrames) {
        const classes = ASR_VOCAB;
        const out = [];
        for (let t = 0; t < numFrames; t++) {
            let bestIdx = 0;
            let bestScore = -Infinity;
            const base = t * classes;
            for (let c = 0; c < classes; c++) {
                const raw = logProbs[base + c];
                const score = (this.temperature > 0 && Math.abs(this.temperature - 1.0) > 1e-8 ? raw / this.temperature : raw)
                    + (c === this.blankId ? this.blankBias : 0.0)
                    + (this.unkId !== null && c === this.unkId ? this.unkBias : 0.0);
                if (score > bestScore) {
                    bestScore = score;
                    bestIdx = c;
                }
            }
            out.push(bestIdx);
        }
        return out;
    }
}
const P2G_MAX_INPUT_LEN = 192;
const P2G_MAX_OUTPUT_LEN = 192;
const P2G_MAX_SEQUENCE_LEN = 416;
export class P2GBrowserModel {
    constructor(engine, handle, tokens) {
        this.engine = engine;
        this.handle = handle;
        this.tokens = tokens;
        this.token2id = new Map(tokens.map((t, i) => [t, i]));
        this.bos = this.token2id.get("<bos>");
        this.src = this.token2id.get("<src>");
        this.tgt = this.token2id.get("<tgt>");
        this.eos = this.token2id.get("<eos>");
        this.pad = this.token2id.get("<pad>");
        this.unk = this.token2id.get("<unk>");
    }
    static async create(options = {}) {
        const engine = await getBrowserEngine();
        const handle = engine.loadP2g(await resolveModelBytes(options.modelUrl, "p2g.hama"));
        let tokens = p2gVocabData.tokens;
        if (options.vocabUrl) {
            const res = await fetch(options.vocabUrl);
            tokens = (await res.json()).tokens;
        }
        return new P2GBrowserModel(engine, handle, tokens.map(String));
    }
    predict(phonemes) {
        const source = normalizePhonemeTokens(phonemes).slice(0, P2G_MAX_INPUT_LEN);
        if (source.length === 0)
            source.push("<unk>");
        let prefix = [this.bos, this.src, ...source.map((t) => this.token2id.get(t) ?? this.unk), this.tgt];
        if (prefix.length >= P2G_MAX_SEQUENCE_LEN) {
            prefix = [...prefix.slice(0, P2G_MAX_SEQUENCE_LEN - 1), this.tgt];
        }
        const maxNew = Math.min(P2G_MAX_OUTPUT_LEN + 1, P2G_MAX_SEQUENCE_LEN - prefix.length);
        const { ids, align } = this.engine.p2gGreedyAlign(this.handle, BigInt64Array.from(prefix, BigInt), maxNew, this.eos, this.pad);
        return decodeP2GOutput(ids, align, this.tokens, source);
    }
}
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toGlobalRegex = (delimiter) => {
    if (typeof delimiter === "string") {
        if (delimiter.length === 0) {
            throw new Error("splitDelimiter must not be an empty string");
        }
        return new RegExp(escapeRegex(delimiter), "gu");
    }
    const flags = delimiter.flags.includes("g") ? delimiter.flags : `${delimiter.flags}g`;
    return new RegExp(delimiter.source, flags.includes("u") ? flags : `${flags}u`);
};
const splitSegments = (text, delimiter) => {
    if (delimiter === null) {
        return [{ text, startCodeUnit: 0 }];
    }
    const regex = toGlobalRegex(delimiter);
    if (regex.test("")) {
        throw new Error("splitDelimiter must not match an empty string");
    }
    regex.lastIndex = 0;
    const segments = [];
    let start = 0;
    for (const match of text.matchAll(regex)) {
        const end = match.index ?? 0;
        if (end > start) {
            segments.push({ text: text.slice(start, end), startCodeUnit: start });
        }
        start = end + match[0].length;
    }
    if (start < text.length) {
        segments.push({ text: text.slice(start), startCodeUnit: start });
    }
    return segments;
};
const codePointOffset = (text, codeUnitOffset) => {
    let codePointIndex = 0;
    let i = 0;
    while (i < codeUnitOffset) {
        const cp = text.codePointAt(i) ?? 0;
        i += cp > 0xffff ? 2 : 1;
        codePointIndex += 1;
    }
    return codePointIndex;
};
const getDefaultPronunciationBrowserModel = () => {
    if (defaultPronunciationBrowserModelPromise == null) {
        defaultPronunciationBrowserModelPromise = G2PBrowserModel.create();
    }
    return defaultPronunciationBrowserModelPromise;
};
export const pronunciationScan = async (text, terms, options = {}) => pronunciationScanWithModel(await getDefaultPronunciationBrowserModel(), text, terms, options);
export const pronunciationReplace = async (text, terms, options = {}) => pronunciationReplaceWithModel(await getDefaultPronunciationBrowserModel(), text, terms, options);
const toFloat32Mono = (waveform) => {
    if (waveform instanceof Float32Array) {
        return clampUnit(waveform);
    }
    if (!Array.isArray(waveform)) {
        throw new Error("waveform must be Float32Array or number[]");
    }
    const out = new Float32Array(waveform.length);
    for (let i = 0; i < waveform.length; i++) {
        out[i] = Number(waveform[i]);
    }
    return clampUnit(out);
};
const clampUnit = (arr) => {
    const out = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        out[i] = v < -1 ? -1 : v > 1 ? 1 : v;
    }
    return out;
};
const resampleLinear = (waveform, srcRate, dstRate) => {
    if (srcRate === dstRate)
        return waveform;
    if (waveform.length === 0)
        return waveform;
    const duration = (waveform.length - 1) / srcRate;
    const dstLen = Math.max(1, Math.round(duration * dstRate) + 1);
    const out = new Float32Array(dstLen);
    for (let i = 0; i < dstLen; i++) {
        const t = i / dstRate;
        const srcPos = t * srcRate;
        const i0 = Math.floor(srcPos);
        const i1 = Math.min(waveform.length - 1, i0 + 1);
        const a = srcPos - i0;
        out[i] = waveform[i0] * (1 - a) + waveform[i1] * a;
    }
    return out;
};
//# sourceMappingURL=browser.js.map