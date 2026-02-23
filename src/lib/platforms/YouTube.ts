import { defaultFetchHeaders } from ".";
import { Platform, VideoId, VideoIdViewsMap, VideoThumbnails } from "./types";
import { chunks, retryWithExpontentialBackoff } from "../utils";

interface YouTubeVideosItemStatistics {
    viewCount: string
}

interface YouTubeVideosItem {
    id: string
    statistics: YouTubeVideosItemStatistics
}

interface YouTubeError {
    code: number
    message: string
}

interface YouTubeBody {
    items: YouTubeVideosItem[]
    error: YouTubeError | undefined
}

const YOUTUBE_CHUNK_SIZE = 35;

class YouTubePlatform implements Platform {

    getViews(
        videoId: VideoId
    ): Promise<number | null> {
        return fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`, { headers: defaultFetchHeaders })
            .then(response => response.json())
            .then(body => {
                const items = body['items']
                const firstItem = items != undefined ? items[0] : null
                return firstItem ? Number.parseInt(firstItem['statistics']['viewCount']) : null
            })
            .catch(_ => { return null })
    }
    
    async getViewsBatch(
        videoIds: VideoId[]
    ): Promise<VideoIdViewsMap | null> {
        const joinedVideoIds = videoIds.join(",")
        const fetchResponse: Response = await fetch((`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${joinedVideoIds}&key=${process.env.YOUTUBE_API_KEY}`), { headers: defaultFetchHeaders })
        const youtubeBody: YouTubeBody = await fetchResponse.json();

        if (fetchResponse.status !== 200) {
            throw new Error(`api error; code: ${youtubeBody.error?.code}, message: ${youtubeBody.error?.message}`)
        }

        const viewsMap: VideoIdViewsMap = new Map();
        for (const item of youtubeBody.items) {
            viewsMap.set(item.id, Number.parseInt(item.statistics.viewCount))
        }

        return viewsMap
    }

    async getViewsConcurrent(
        videoIds: VideoId[],
        concurrency: number = 5,
        maxRetries?: number
    ): Promise<VideoIdViewsMap> {
        const viewsMap: VideoIdViewsMap = new Map();
        const videoIdChunks = [...chunks(videoIds, YOUTUBE_CHUNK_SIZE)];
        const getViewsBatch = new YouTubePlatform().getViewsBatch;

        async function processChunk(chunk: VideoId[]) {
            const result = await retryWithExpontentialBackoff(
                () => getViewsBatch(chunk),
                maxRetries
            );

            if (result !== null) {
                for (const [id, views] of result.entries()) {
                    viewsMap.set(id, views);
                }
            }
        }

        for (let i = 0; i < videoIdChunks.length; i += concurrency) {
            const batch = videoIdChunks.slice(i, i + concurrency);
            await Promise.all(batch.map(processChunk))
        }

        return viewsMap;
    }

    getThumbnails(
        videoId: VideoId
    ): Promise<VideoThumbnails> {
        const defaultThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        const maxResThumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

        return fetch(maxResThumb, { headers: defaultFetchHeaders })
            .then(res => {
                return {
                    default: defaultThumb,
                    quality: res.status == 404 ? defaultThumb : maxResThumb
                }
            })
            .catch(_ => {
                return {
                    default: defaultThumb,
                    quality: defaultThumb
                }
            })
    }

}

const YouTube = new YouTubePlatform()
export default YouTube