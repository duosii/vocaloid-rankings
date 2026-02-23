import { Platform, VideoId, VideoIdViewsMap, VideoThumbnails } from "./types";
import { defaultFetchHeaders } from ".";
import { retryWithExpontentialBackoff } from "../utils";

const nicoNicoVideoDomain = "https://www.nicovideo.jp/watch/"

const nicoNicoAPIDomain = "https://nvapi.nicovideo.jp/v1/"
const headers = {
    //...defaultFetchHeaders,
    'x-Frontend-Id': '6',
    'x-Frontend-version': '0'
}

const viewsRegExp = /WatchAction","userInteractionCount":(\d+)}/gm
const thumbnailRegExp = /<meta data-server="1" property="og:image" content="(https:\/\/img\.cdn\.nimg\.jp\/s\/nicovideo\/thumbnails\/\d+\/\d+\.\d+\.original\/r1280x720l\?key=[\d\w]+)" \/>/gm

async function getViewsFallback(
    videoId: VideoId
): Promise<number | null> {
    const result = await fetch(nicoNicoVideoDomain + videoId, {
        method: 'GET',
    })
    if (!result) return null

    const text = await result.text()

    const match = viewsRegExp.exec(text)

    return match === null ? null : Number.parseInt(match[1])
}

function getThumbnailsFallback(
    videoId: VideoId
): Promise<VideoThumbnails | null> {
    return fetch(nicoNicoVideoDomain + videoId)
        .then(response => response.text())
        .then(text => {
            const match = thumbnailRegExp.exec(text)

            return match === null ? null : {
                default: match[1],
                quality: match[1]
            }
        })
        .catch(_ => { return null })
}

class NiconicoPlatform implements Platform {

    // https://niconicolibs.github.io/api/nvapi/#tag/Video
    getViews(
        videoId: VideoId
    ): Promise<number | null> {
        return fetch(`${nicoNicoAPIDomain}videos?watchIds=${videoId}`, {
            headers: headers
        }).then(res => res.json())
            .then(videoData => {
                return videoData['data']['items'][0]['video']['count']['view']
            })
            .catch(_ => getViewsFallback(videoId))
    }

    async getViewsConcurrent(
        videoIds: VideoId[],
        concurrency: number = 10,
        maxRetries?: number
    ): Promise<VideoIdViewsMap> {
        const viewsMap: VideoIdViewsMap = new Map();
        const getViews = new NiconicoPlatform().getViews;

        async function processVideoId(videoId: VideoId) {
            const views = await retryWithExpontentialBackoff(
                () => getViews(videoId),
                maxRetries
            )

            if (views !== null) {
                viewsMap.set(videoId, views);
            }
        }

        for (let i = 0; i < videoIds.length; i += concurrency) {
            const batch = videoIds.slice(i, i + concurrency);
            await Promise.all(batch.map(processVideoId))
        }

        return viewsMap;
    }

    getThumbnails(
        videoId: VideoId
    ): Promise<VideoThumbnails | null> {
        return fetch(`${nicoNicoAPIDomain}videos?watchIds=${videoId}`, {
            headers: headers
        }).then(res => res.json())
            .then(videoData => {
                const thumbnails = videoData['data']['items'][0]['video']['thumbnail']
                const defaultThumbnail = thumbnails['listingUrl']
                return {
                    default: defaultThumbnail,
                    quality: thumbnails['nHdUrl'] || thumbnails['largeUrl'] || defaultThumbnail
                }
            })
            .catch(_ => getThumbnailsFallback(videoId))
    }

}

const Niconico = new NiconicoPlatform()
export default Niconico