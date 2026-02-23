import { defaultFetchHeaders } from ".";
import { retryWithExpontentialBackoff } from "../utils";
import { Platform, VideoId, VideoIdViewsMap, VideoThumbnails } from "./types";

const bilibiliVideoDataEndpoint = "https://api.bilibili.com/x/web-interface/view?aid="
const bilibiliAidRegExp = /av(.+)/

class bilibiliPlatform implements Platform {

    getViews(
        videoId: VideoId
    ): Promise<number | null> {
        const aidMatches = videoId.match(bilibiliAidRegExp)
        const trimmedAid = aidMatches ? aidMatches[1] : videoId

        return fetch(bilibiliVideoDataEndpoint + trimmedAid, { headers: defaultFetchHeaders })
            .then(response => response.json())
            .then(body => {
                if (!body || body['code'] != 0) return null
                return Number.parseInt(body['data']['stat']['view'])
            })
            .catch(_ => { return null })
    }

    async getViewsConcurrent(
        videoIds: VideoId[],
        concurrency: number = 1,
        maxRetries?: number
    ): Promise<VideoIdViewsMap> {
        const viewsMap: VideoIdViewsMap = new Map();
        const getViews = new bilibiliPlatform().getViews;

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
        const aidMatches = videoId.match(bilibiliAidRegExp)
        const trimmedAid = aidMatches ? aidMatches[1] : videoId

        return fetch(bilibiliVideoDataEndpoint + trimmedAid, { headers: defaultFetchHeaders })
            .then(response => response.json())
            .then(body => {
                if (!body || body['code'] != 0) return null
                const thumbnail = body['data']['pic']
                return {
                    default: thumbnail,
                    quality: thumbnail
                }
            })
            .catch(_ => { return null })
    }

}

const bilibili = new bilibiliPlatform()
export default bilibili