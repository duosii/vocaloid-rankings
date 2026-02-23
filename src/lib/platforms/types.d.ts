import { SourceType } from "@/data/types"

export type VideoId = string

export  type VideoIdViewsMap = Map<VideoId, number>;

export interface VideoThumbnails {
    default: string
    quality: string
}

export interface Platform {

    getViews(videoId: VideoId): Promise<number | null>

    getViewsConcurrent(
        videoIds: VideoId[],
        concurrency: number,
        maxRetries: number
    ): Promise<VideoIdViewsMap>

    getThumbnails(videoId: VideoId): Promise<VideoThumbnails | null>

}