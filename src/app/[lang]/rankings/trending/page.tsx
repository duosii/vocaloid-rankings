import { getMostRecentViewsTimestamp } from "@/data/songsData"
import { FilterDirection, SongType, SourceType } from "@/data/types"
import { generateTimestamp } from "@/lib/utils"
import { Locale, getDictionary } from "@/localization"
import { cookies } from "next/headers"
import { Settings } from "../../settings"
import { TrendingRankingsList } from "../trending-rankings-list"
import { ArtistRankingsFiltersValues, FilterType, TrendingFilters } from "../types"
import { Metadata } from "next"

const filters: TrendingFilters = {
    timePeriod: {
        name: 'filter_time_period_offset',
        key: 'timePeriod',
        displayActive: true,
        type: FilterType.SELECT,
        values: [
            { name: 'filter_time_period_offset_day', value: 1 },
            { name: 'filter_time_period_offset_week', value: 7 },
            { name: 'filter_time_period_offset_month', value: 30 },
            { name: 'filter_time_period_offset_custom', value: 1 }
        ],
        defaultValue: 0
    },
    from: {
        name: 'filter_time_period_offset_custom_from',
        key: 'from',
        displayActive: true,
        type: FilterType.TIMESTAMP,
        placeholder: 'filter_timestamp_latest',
    },
    timestamp: {
        name: 'filter_timestamp',
        key: 'timestamp',
        displayActive: true,
        type: FilterType.TIMESTAMP,
        placeholder: 'filter_timestamp_latest',
    },
    direction: {
        name: 'filter_direction',
        key: 'direction',
        displayActive: false,
        type: FilterType.SELECT,
        values: [
            { name: 'filter_direction_descending', value: FilterDirection.DESCENDING },
            { name: 'filter_direction_ascending', value: FilterDirection.ASCENDING }
        ],
        defaultValue: 0 // default value
    },
    startAt: {
        name: 'filter_artist_type',
        key: 'startAt',
        displayActive: false,
        type: FilterType.INPUT,
        placeholder: 'filter_views_any',
        defaultValue: ''
    },
    includeSourceTypes: {
        name: 'filter_view_type',
        key: 'includeSourceTypes',
        displayActive: true,
        type: FilterType.MULTI,
        values: [
            { name: "youtube", value: SourceType.YOUTUBE },
            { name: 'niconico', value: SourceType.NICONICO },
            { name: 'bilibili', value: SourceType.BILIBILI },
        ]
    },
    excludeSourceTypes: {
        name: 'filter_view_type_exclude',
        key: 'excludeSourceTypes',
        displayActive: true,
        type: FilterType.MULTI,
        values: [
            { name: "youtube", value: SourceType.YOUTUBE },
            { name: 'niconico', value: SourceType.NICONICO },
            { name: 'bilibili', value: SourceType.BILIBILI },
        ]
    },
    includeSongTypes: {
        name: 'filter_song_type', // name
        key: 'includeSongTypes',
        displayActive: true,
        type: FilterType.MULTI,
        values: [
            { name: 'filter_song_type_original', value: SongType.ORIGINAL },
            { name: 'filter_song_type_remix', value: SongType.REMIX },
            { name: 'filter_song_type_other', value: SongType.OTHER },
            { name: 'filter_song_type_cover', value: SongType.COVER },
            { name: 'filter_song_type_remaster', value: SongType.REMASTER },
            { name: "filter_song_type_drama_pv", value: SongType.DRAMA_PV},
            { name: "filter_song_type_music_pv", value: SongType.MUSIC_PV},
        ]
    },
    excludeSongTypes: {
        name: 'filter_song_type_exclude', // name
        key: 'excludeSongTypes',
        displayActive: true,
        type: FilterType.MULTI,
        values: [
            { name: 'filter_song_type_original', value: SongType.ORIGINAL },
            { name: 'filter_song_type_remix', value: SongType.REMIX },
            { name: 'filter_song_type_other', value: SongType.OTHER },
            { name: 'filter_song_type_cover', value: SongType.COVER },
            { name: 'filter_song_type_remaster', value: SongType.REMASTER },
            { name: "filter_song_type_drama_pv", value: SongType.DRAMA_PV},
            { name: "filter_song_type_music_pv", value: SongType.MUSIC_PV},
        ],
        defaultValue: [SongType.DRAMA_PV]
    },
}

export async function generateMetadata(
    props: {
        params: Promise<{
            lang: Locale
        }>
    }
): Promise<Metadata> {
    const params = await props.params;
    const langDict = await getDictionary(params.lang)

    return {
        title: langDict.trending_page_title,
    }
}

export default async function RankingsPage(
    props: {
        params: Promise<{
            lang: Locale
        }>,
        searchParams: Promise<ArtistRankingsFiltersValues>
    }
) {
    const params = await props.params;
    // import language dictionary
    const lang = params.lang
    const langDict = await getDictionary(lang)

    // get settings
    const settings = new Settings(await cookies())

    // general variables
    const viewMode = settings.rankingsViewMode

    const mostRecentTimestamp = (await getMostRecentViewsTimestamp()) || generateTimestamp()

    return (
        <section className="flex flex-col gap-5 w-full min-h-screen">
            <h1 className="font-bold md:text-5xl md:text-left text-4xl text-center w-full mb-5">{langDict.trending_page_title}</h1>
            <TrendingRankingsList
                href=''
                filters={filters}
                defaultFilters={{
                    excludeSongTypes: (SongType.DRAMA_PV).toString()
                }}
                currentTimestamp={mostRecentTimestamp}
                viewMode={viewMode}
            />
        </section>
    )
}