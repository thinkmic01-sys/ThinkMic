// Server-derived audio duration, deliberately not trusted from the client - a self-reported
// duration could otherwise be used to dodge the transcription-minutes package limit (see
// usageService.js). music-metadata is ESM-only as of the installed version, hence the
// dynamic import inside these CommonJS-exported functions.

async function getDurationSecondsFromFile(filePath) {
    try {
        const { parseFile } = await import('music-metadata');
        const metadata = await parseFile(filePath);
        if (!metadata.format.duration) {
            // Parsing itself succeeded (no throw below), but the file's own metadata didn't
            // include a duration - a genuinely instant/silent clip and a malformed file that
            // parses without error both land here, so this is worth knowing about separately
            // from an outright parse failure, even though both currently fall back to 0.
            console.warn(`audioDurationService.getDurationSecondsFromFile: no duration found in ${filePath}`);
            return 0;
        }
        return Math.round(metadata.format.duration);
    } catch (err) {
        console.error('audioDurationService.getDurationSecondsFromFile error:', err.message);
        return 0;
    }
}

async function getDurationSecondsFromBuffer(buffer, mimeType) {
    try {
        const { parseBuffer } = await import('music-metadata');
        const metadata = await parseBuffer(buffer, mimeType);
        if (!metadata.format.duration) {
            console.warn(`audioDurationService.getDurationSecondsFromBuffer: no duration found (mimeType: ${mimeType})`);
            return 0;
        }
        return Math.round(metadata.format.duration);
    } catch (err) {
        console.error('audioDurationService.getDurationSecondsFromBuffer error:', err.message);
        return 0;
    }
}

module.exports = { getDurationSecondsFromFile, getDurationSecondsFromBuffer };
