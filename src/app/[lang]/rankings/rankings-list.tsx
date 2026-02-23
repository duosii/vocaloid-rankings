'use client'
import { EntityName } from "@/components/formatters/entity-name"
import { SongArtistsLabel } from "@/components/formatters/song-artists-label"
import { Divider } from "@/components/material/divider"
import { useLocale } from "@/components/providers/language-dictionary-provider"
import { RankingsApiError } from "@/components/rankings/rankings-api-error"
import { RankingsContainer } from "@/components/rankings/rankings-container"
import { RankingsItemTrailing } from "@/components/rankings/rankings-item-trailing"
import { RankingListItem } from "@/components/rankings/rankings-list-item"
import { RankingsPageSelector } from "@/components/rankings/rankings-page-selector"
import { RankingsSkeleton } from "@/components/rankings/rankings-skeleton"
import { TransitioningRankingsGridItem } from "@/components/rankings/transitioning-rankings-grid-item"
import { ArtistType, FilterDirection, FilterInclusionMode, FilterOrder, SongRankingsFilterParams, SongType, SourceType } from "@/data/types"
import { GET_SONG_RANKINGS, buildEntityNames, graphClient } from "@/lib/api"
import { ApiArtist, ApiSongRankingsFilterResult } from "@/lib/api/types"
import { buildFuzzyDate } from "@/lib/utils"
import { getEntityName } from "@/localization"
import { Result, useQuery } from "graphql-hooks"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { TransitionGroup } from "react-transition-group"
import { useSettings } from "../../../components/providers/settings-provider"
import { SongRankingsFilterBar } from "./song-rankings-filter-bar"
import { EntityNames, FilterType, InputFilter, RankingsFilters, RankingsViewMode, SongRankingsFilterBarValues, SongRankingsFiltersValues } from "./types"
import { buildRankingsQuery, decodeBoolean, decodeMultiFilter, encodeBoolean, encodeMultiFilter, getDateSearchParam, getNumericSearchParam, getRankingsItemTrailingSupportingText, parseParamSelectFilterValue, pickSongDefaultOrSearchParam } from "./utils"
import { useRouter, useSearchParams } from "next/navigation"

const GET_ARTISTS_NAMES = `
query GetArtistsNames(
    $ids: [Int]!
) {
    artists(
        ids: $ids
    ) {
        id
        names {
            original
            japanese
            english
            romaji
        }
    }
}
`

export function RankingsList(
    {
        href,
        filters,
        defaultFilters,
        currentTimestamp,
        viewMode
    }: {
        href: string
        filters: RankingsFilters
        defaultFilters: SongRankingsFiltersValues
        currentTimestamp: string
        viewMode: RankingsViewMode
    }
) {
    // import contexts
    const { settings, setRankingsViewMode } = useSettings()
    const { resolvedTheme } = useTheme()
    const langDict = useLocale()

    // import settings
    const settingTitleLanguage = settings.titleLanguage
    const [rankingsViewMode, setViewMode] = useState(viewMode)

    // import search params
    const searchParams = useSearchParams()

    // convert current timestamp to date
    const currentTimestampDate = new Date(currentTimestamp)

    // convert filterValues into filterBarValues
    let [filterBarValues, setFilterValues] = useState<SongRankingsFilterBarValues>({})
    let [filterBarValuesLoaded, setFilterValuesLoaded] = useState(false)

    // entity names state
    const [entityNames, setEntityNames] = useState({} as EntityNames)

    // returns a table of query variables for querying GraphQL with.
    const getQueryVariables = () => {
        // build & set query variables
        const includeSourceTypes = filterBarValues.includeSourceTypes?.map(type => SourceType[filters.includeSourceTypes.values[type].value || 0])
        const excludeSourceTypes = filterBarValues.excludeSourceTypes?.map(type => SourceType[filters.excludeSourceTypes.values[type].value || 0])
        const includeSongTypes = filterBarValues.includeSongTypes?.map(type => SongType[filters.includeSongTypes.values[type].value || 0])
        const excludeSongTypes = filterBarValues.excludeSongTypes?.map(type => SongType[filters.excludeSongTypes.values[type].value || 0])
        const includeArtistTypes = filterBarValues.includeArtistTypes?.map(type => ArtistType[filters.includeArtistTypes.values[type].value || 0])
        const excludeArtistTypes = filterBarValues.excludeArtistTypes?.map(type => ArtistType[filters.excludeArtistTypes.values[type].value || 0])

        // build publish date
        const publishYear = filterBarValues.publishYear
        const publishMonth = filterBarValues.publishMonth
        const publishDay = filterBarValues.publishDay

        const publishDate = (publishYear || publishMonth || publishDay) ? buildFuzzyDate(publishYear, publishMonth, publishDay) : undefined

        // get custom time period offset
        const to = filterBarValues.timestamp || currentTimestampDate
        const from = filterBarValues.from

        let customTimePeriodOffset: number | undefined
        if (filterBarValues.timePeriod == 4 && from && to) {
            // get the difference in milliseconds between the two dates
            const difference = Math.abs(to.getTime() - from.getTime())
            // convert the difference, which is in milliseconds into days and set the timePeriodOffset to that value
            customTimePeriodOffset = Math.floor(difference / (24 * 60 * 60 * 1000))
        }

        return {
            timestamp: filterBarValues.timestamp ? filterBarValues.timestamp?.toISOString() : undefined,
            timePeriodOffset: customTimePeriodOffset !== undefined ? customTimePeriodOffset : parseParamSelectFilterValue(filterBarValues.timePeriod, filters.timePeriod.values, filters.timePeriod.defaultValue),
            includeSourceTypes: includeSourceTypes && includeSourceTypes.length > 0 ? includeSourceTypes : undefined,
            excludeSourceTypes: excludeSourceTypes && excludeSourceTypes.length > 0 ? excludeSourceTypes : undefined,
            includeSongTypes: includeSongTypes && includeSongTypes.length > 0 ? includeSongTypes : undefined,
            excludeSongTypes: excludeSongTypes && excludeSongTypes.length > 0 ? excludeSongTypes : undefined,
            includeArtistTypes: includeArtistTypes && includeArtistTypes.length > 0 ? includeArtistTypes : undefined,
            excludeArtistTypes: excludeArtistTypes && excludeArtistTypes.length > 0 ? excludeArtistTypes : undefined,
            includeArtistTypesMode: filterBarValues.includeArtistTypesMode == undefined ? undefined : FilterInclusionMode[filterBarValues.includeArtistTypesMode],
            excludeArtistTypesMode: filterBarValues.excludeArtistTypesMode == undefined ? undefined : FilterInclusionMode[filterBarValues.excludeArtistTypesMode],
            publishDate: publishDate,
            orderBy: filterBarValues.orderBy == undefined ? undefined : FilterOrder[filterBarValues.orderBy],
            includeArtists: filterBarValues.includeArtists && filterBarValues.includeArtists.length > 0 ? [...filterBarValues.includeArtists] : undefined, // unpack artists into new table so that the reference is different
            excludeArtists: filterBarValues.excludeArtists && filterBarValues.excludeArtists.length > 0 ? [...filterBarValues.excludeArtists] : undefined,
            includeArtistsMode: filterBarValues.includeArtistsMode == undefined ? undefined : FilterInclusionMode[filterBarValues.includeArtistsMode],
            excludeArtistsMode: filterBarValues.excludeArtistsMode == undefined ? undefined : FilterInclusionMode[filterBarValues.excludeArtistsMode],
            includeSimilarArtists: filterBarValues.includeSimilarArtists,
            singleVideo: filterBarValues.singleVideo,
            minViews: filterBarValues.minViews ? Number(filterBarValues.minViews) : undefined,
            maxViews: filterBarValues.maxViews ? Number(filterBarValues.maxViews) : undefined,
            search: filterBarValues.search == '' ? undefined : filterBarValues.search,
            direction: filterBarValues.direction === undefined ? undefined : FilterDirection[filterBarValues.direction],
            startAt: Number(filterBarValues.startAt),
            list: filterBarValues.list
        }
    }

    // import graphql context
    const [queryVariables, setQueryVariables] = useState(getQueryVariables)
    const { loading, error, data } = useQuery(GET_SONG_RANKINGS, {
        variables: queryVariables,
        skip: !filterBarValuesLoaded
    })
    const rankingsResult = data?.songRankings as ApiSongRankingsFilterResult | undefined

    let youtubePlaylistUrl: string | null = null;
    if (rankingsResult !== undefined) {
        // https://www.youtube.com/watch_videos?video_ids=sV2H712ldOI,_JeLNAjjBHw
        let videoIds = rankingsResult.results.map(song => song.song.videoIds.youtube?.[0] ?? null).filter(val => val !== null);
        youtubePlaylistUrl = `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(",")}`
    }

    // function for saving filter values & updating the UI with the new values.
    function saveFilterValues(
        newValues: SongRankingsFilterBarValues,
        refresh: boolean = true,
        merge: boolean = true,
        setParams: boolean = true
    ) {
        filterBarValues = merge ? { ...newValues } : newValues
        setFilterValues(filterBarValues)
        // set url
        if (refresh) {
            if (setParams) {
                history.pushState({}, 'Song rankings filter changed.', `${href}?${buildRankingsQuery(filterBarValues, filters)}`)
            }
            setQueryVariables(getQueryVariables())
        }
    }

    // load search parameters
    useEffect(() => {
        setFilterValuesLoaded(true)
        saveFilterValues({
            search: pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'search'),
            timePeriod: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'timePeriod')),
            publishYear: pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'publishYear'),
            publishMonth: pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'publishMonth'),
            publishDay: pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'publishDay'),
            includeSourceTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'includeSourceTypes')),
            excludeSourceTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'excludeSourceTypes')),
            includeSongTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'includeSongTypes')),
            excludeSongTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'excludeSongTypes')),
            includeArtistTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'includeArtistTypes')),
            excludeArtistTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'excludeArtistTypes')),
            includeArtistTypesMode: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'includeArtistTypesMode')),
            excludeArtistTypesMode: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'excludeArtistTypesMode')),
            minViews: pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'minViews'),
            maxViews: pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'maxViews'),
            orderBy: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'orderBy')),
            from: getDateSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'from')),
            timestamp: getDateSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'timestamp')),
            singleVideo: decodeBoolean(getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'singleVideo'))),
            includeArtists: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'includeArtists')),
            excludeArtists: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'excludeArtists')),
            includeArtistsMode: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'includeArtistsMode')),
            excludeArtistsMode: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'excludeArtistsMode')),
            includeSimilarArtists: decodeBoolean(getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'includeSimilarArtists'))),
            direction: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'direction')),
            startAt: pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'startAt'),
            list: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'list'))
        }, true, true, false)
    }, [])

    // load entity names map
    useEffect(() => {
        const artists = [...(filterBarValues.includeArtists || []), ...(filterBarValues.excludeArtists || [])]
        if (artists && artists.length > 0) {
            graphClient.request({
                query: GET_ARTISTS_NAMES,
                variables: {
                    ids: artists
                }
            }).then((result: Result<any, any>) => {
                if (!result.error) {
                    const nameMap: EntityNames = {}
                    for (const artist of result.data.artists as ApiArtist[]) {
                        nameMap[artist.id] = getEntityName(buildEntityNames(artist.names), settingTitleLanguage)
                    }
                    setEntityNames({ ...entityNames, ...nameMap })
                }
            }).catch(_ => { })
        }
    }, [settingTitleLanguage, filterBarValuesLoaded])

    // load view mode
    useEffect(() => {
        setViewMode(settings.rankingsViewMode)
    }, [settings.rankingsViewMode])

    // calculate the filter mode
    const filterMode = filters.orderBy.values[filterBarValues.orderBy || filters.orderBy.defaultValue].value || FilterOrder.VIEWS

    return (
        <section className="flex flex-col w-full">
            <SongRankingsFilterBar
                filters={filters}
                filterValues={filterBarValues}
                currentTimestamp={currentTimestampDate}
                setFilterValues={(newValues, route, merge) => {
                    //filterBarValues.startAt = '0'
                    saveFilterValues(newValues, route, merge)
                }}
                setRankingsViewMode={setRankingsViewMode}
                entityNames={entityNames}
                setEntityNames={newNames => setEntityNames({ ...newNames })}
                playlistUrl={youtubePlaylistUrl}
            />
            <Divider className="mb-5" />

            {error ? <RankingsApiError error={error} />
                : !loading && filterBarValuesLoaded && (rankingsResult == undefined || 0 >= rankingsResult.results.length) ? <h2 className="text-3xl font-bold text-center text-on-background">{langDict.search_no_results}</h2>
                    : rankingsResult == undefined ? <RankingsSkeleton elementCount={50} viewMode={rankingsViewMode} />
                        : <RankingsContainer viewMode={rankingsViewMode}>
                            <TransitionGroup component={null}>{rankingsResult.results.map(ranking => {
                                const song = ranking.song
                                const names = buildEntityNames(song.names)

                                const color = resolvedTheme == 'dark' ? song.darkColor : song.lightColor

                                const trailing = <RankingsItemTrailing
                                    mode={filterMode}
                                    value={ranking.views}
                                    publishDate={song.publishDate}
                                    additionDate={song.additionDate}
                                />

                                const trailingSupporting = getRankingsItemTrailingSupportingText(filterMode, langDict.rankings_views, undefined, langDict.rankings_publish_date, langDict.rankings_addition_date)

                                return rankingsViewMode == RankingsViewMode.LIST ? (
                                    <RankingListItem
                                        key={song.id.toString()}
                                        href={`/song/${song.id}`}
                                        titleContent={<EntityName names={names} preferred={settingTitleLanguage} />}
                                        placement={ranking.placement}
                                        icon={song.thumbnail}
                                        iconAlt={getEntityName(names, settingTitleLanguage)}
                                        trailingTitleContent={trailing}
                                        trailingSupporting={trailingSupporting}
                                        supportingContent={<SongArtistsLabel artists={song.artists} categories={song.artistsCategories} preferredNameType={settingTitleLanguage} theme={resolvedTheme} />}
                                        color={color}
                                    />
                                ) : (
                                    <TransitioningRankingsGridItem
                                        key={song.id.toString()}
                                        href={`/song/${song.id}`}
                                        titleContent={<EntityName names={names} preferred={settingTitleLanguage} />}
                                        placement={ranking.placement}
                                        icon={song.thumbnail}
                                        iconAlt={getEntityName(names, settingTitleLanguage)}
                                        trailingTitleContent={trailing}
                                        trailingSupporting={trailingSupporting}
                                        color={color}
                                    />
                                )
                            })}</TransitionGroup>
                        </RankingsContainer>
            }
            <RankingsPageSelector
                currentOffset={Number(filterBarValues.startAt)}
                totalCount={rankingsResult?.totalCount}
                onOffsetChanged={(newOffset) => {
                    filterBarValues.startAt = newOffset.toString()
                    saveFilterValues(filterBarValues)
                }}
            />
        </section>
    )
}