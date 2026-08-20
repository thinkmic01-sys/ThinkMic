// Server-derived audio duration, deliberately not trusted from the client - a self-reported
// duration could otherwise be used to dodge the transcription-minutes package limit (see
// usageService.js). music-metadata is ESM-only as of the installed version, hence the
// dynamic import inside these CommonJS-exported functions.

async function getDurationSecondsFromFile(filePath) {
    try {
        const { parseFile } = await import('music-metadata');
        const metadata = await parseFile(filePath);
        return metadata.format.duration ? Math.round(metadata.format.duration) : 0;
    } catch (err) {
        console.error('audioDurationService.getDurationSecondsFromFile error:', err.message);
        return 0;
    }
}

async function getDurationSecondsFromBuffer(buffer, mimeType) {
    try {
        const { parseBuffer } = await import('music-metadata');
        const metadata = await parseBuffer(buffer, mimeType);
        return metadata.format.duration ? Math.round(metadata.format.duration) : 0;
    } catch (err) {
        console.error('audioDurationService.getDurationSecondsFromBuffer error:', err.message);
        return 0;
    }
}

module.exports = { getDurationSecondsFromFile, getDurationSecondsFromBuffer };
