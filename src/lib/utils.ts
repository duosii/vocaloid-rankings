import { ArtistCategory, ArtistType } from "@/data/types"
import { RefObject } from "react"

/**
 * Takes an array and generates chunks of chunkSize from this array.
 * 
 * For example, if you had an array of length 100 and a chunkSize of 50, 
 * this generator would generate two arrays of 50 length from that
 * original array.
 * 
 * @param arr The array to generate chunks from.
 * @param chunkSize The size of chunks to generate.
 */
export function* chunks<T>(arr: T[], chunkSize: number): Generator<T[]> {
    for (let i = 0; i < arr.length; i += chunkSize) {
        yield arr.slice(i, i + chunkSize);
    }
}

export async function retryWithExpontentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000,
): Promise<T | null> {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            return await operation()
        } catch (err) {
            console.error(err)
            
            retries++;

            if (retries === maxRetries) {
                break
            }

            const delay = Math.min(
                baseDelay * Math.pow(2, retries - 1) + Math.random() * 1000,
                maxDelay
            )

            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
    return null
}

export function timeoutDebounce(
    ref: RefObject<NodeJS.Timeout | undefined>,
    timeout: number,
    callback: () => void
) {
    if (ref) {
        clearTimeout(ref.current)
    }

    ref.current = setTimeout(callback, timeout)
}

// takes an iso timestamp and converts it into a local date. (only the year, month, day part of the timestamp.)
export function localISOTimestampToDate(
    isoTimestamp: string
): Date | null {
    try {
        const split = isoTimestamp.split('-')

        const year = Number(split[0])
        const month = Number(split[1])
        const day = Number(split[2])

        return new Date(year, month - 1, day)
    } catch (error) {
        return null
    }
}

export const generateTimestamp = (
    date: Date = new Date()
): string => {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0')
}

export const buildFuzzyDate = (
    year?: string,
    month?: string,
    day?: string
): string => {
    const fuzzyYear = !year || isNaN(Number(year)) ? '%' : year
    const fuzzyMonth = !month || isNaN(Number(month)) ? '%' : month.padStart(2, '0')
    const fuzzyDay = !day || isNaN(Number(day)) ? '%' : day.padStart(2, '0')
    return `${fuzzyYear}-${fuzzyMonth}-${fuzzyDay}%`
}

export function mapArtistTypeToCategory(
    type: ArtistType
): ArtistCategory {
    switch (type) {
        case ArtistType.VOCALOID:
        case ArtistType.CEVIO:
        case ArtistType.SYNTHESIZER_V:
        case ArtistType.OTHER_VOCALIST:
        case ArtistType.OTHER_VOICE_SYNTHESIZER:
        case ArtistType.UTAU:
        case ArtistType.PROJECT_SEKAI:
        case ArtistType.VOICEROID:
            return ArtistCategory.VOCALIST
        default:
            return ArtistCategory.PRODUCER
    }
}

export function substituteStringVariables(
    toSub: string,
    variableMap: { [variableName: string]: any }
): string {
    for (const variable in variableMap) {
        const replaceWith = variableMap[variable]
        toSub = toSub.replaceAll(`:${variable}`, replaceWith)
    }
    return toSub
}
export const artistCategoryToApiArtistTypeNames: {
    [key in ArtistCategory]: String[];
} = {
    [ArtistCategory.VOCALIST]: [
        ArtistType[ArtistType.VOCALOID],
        ArtistType[ArtistType.CEVIO],
        ArtistType[ArtistType.SYNTHESIZER_V],
        ArtistType[ArtistType.OTHER_VOCALIST],
        ArtistType[ArtistType.OTHER_VOICE_SYNTHESIZER],
        ArtistType[ArtistType.UTAU],
        ArtistType[ArtistType.PROJECT_SEKAI],
        ArtistType[ArtistType.VOICEROID]
    ],
    [ArtistCategory.PRODUCER]: [
        ArtistType[ArtistType.ILLUSTRATOR],
        ArtistType[ArtistType.COVER_ARTIST],
        ArtistType[ArtistType.ANIMATOR],
        ArtistType[ArtistType.PRODUCER],
        ArtistType[ArtistType.OTHER_INDIVIDUAL],
        ArtistType[ArtistType.OTHER_GROUP]
    ]
};

export const artistCategoryToApiArtistTypes: {
    [key in ArtistCategory]: ArtistType[];
} = {
    [ArtistCategory.VOCALIST]: [
        ArtistType.VOCALOID,
        ArtistType.CEVIO,
        ArtistType.SYNTHESIZER_V,
        ArtistType.OTHER_VOCALIST,
        ArtistType.OTHER_VOICE_SYNTHESIZER,
        ArtistType.UTAU,
        ArtistType.PROJECT_SEKAI,
        ArtistType.VOICEROID
    ],
    [ArtistCategory.PRODUCER]: [
        ArtistType.ILLUSTRATOR,
        ArtistType.COVER_ARTIST,
        ArtistType.ANIMATOR,
        ArtistType.PRODUCER,
        ArtistType.OTHER_INDIVIDUAL,
        ArtistType.OTHER_GROUP
    ]
};