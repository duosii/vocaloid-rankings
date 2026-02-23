'use client'
import { ImageDisplayMode } from "@/components"
import { EntityName } from "@/components/formatters/entity-name"
import { Divider } from "@/components/material/divider"
import { useLocale } from "@/components/providers/language-dictionary-provider"
import { RankingsApiError } from "@/components/rankings/rankings-api-error"
import { RankingsContainer } from "@/components/rankings/rankings-container"
import { RankingsItemTrailing } from "@/components/rankings/rankings-item-trailing"
import { RankingListItem } from "@/components/rankings/rankings-list-item"
import { RankingsPageSelector } from "@/components/rankings/rankings-page-selector"
import { RankingsSkeleton } from "@/components/rankings/rankings-skeleton"
import { TransitioningRankingsGridItem } from "@/components/rankings/transitioning-rankings-grid-item"
import { FilterDirection, FilterOrder, SongType, SourceType } from "@/data/types"
import { GET_SONG_RANKINGS, buildEntityNames } from "@/lib/api"
import { ApiSongRankingsFilterResult } from "@/lib/api/types"
import { getEntityName } from "@/localization"
import { useQuery } from "graphql-hooks"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { TransitionGroup } from "react-transition-group"
import { useSettings } from "../../../components/providers/settings-provider"
import { TrendingActiveFilterBar } from "./trending-filter-bar"
import { ArtistRankingsFilterBarValues, EntityNames, FilterType, InputFilter, RankingsViewMode, SongRankingsFilterBarValues, TrendingFilterBarValues, TrendingFilters, TrendingFiltersValues } from "./types"
import { buildRankingsQuery, decodeMultiFilter, encodeBoolean, encodeMultiFilter, getDateSearchParam, getNumericSearchParam, getRankingsItemTrailingSupportingText, parseParamSelectFilterValue, pickSongDefaultOrSearchParam } from "./utils"
import { SongArtistsLabel } from "@/components/formatters/song-artists-label"
import { useSearchParams } from "next/navigation"

export function TrendingRankingsList(
    {
        href,
        filters,
        defaultFilters,
        currentTimestamp,
        viewMode,
    }: {
        href: string
        filters: TrendingFilters
        defaultFilters: TrendingFiltersValues
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
    let [filterBarValuesLoaded, setFilterBarValuesLoaded] = useState(false)

    // returns a table of query variables for querying GraphQL with.
    const getQueryVariables = () => {
        // build & set query variables
        const includeSourceTypes = filterBarValues.includeSourceTypes?.map(type => SourceType[filters.includeSourceTypes.values[type].value || 0])
        const excludeSourceTypes = filterBarValues.excludeSourceTypes?.map(type => SourceType[filters.excludeSourceTypes.values[type].value || 0])
        const includeSongTypes = filterBarValues.includeSongTypes?.map(type => SongType[filters.includeSongTypes.values[type].value || 0])
        const excludeSongTypes = filterBarValues.excludeSongTypes?.map(type => SongType[filters.excludeSongTypes.values[type].value || 0])

        // get custom time period offset
        const to = filterBarValues.timestamp || currentTimestampDate
        const from = filterBarValues.from

        let customTimePeriodOffset: number | undefined
        if (filterBarValues.timePeriod == 3 && from && to) {
            // get the difference in milliseconds between the two dates
            const difference = Math.abs(to.getTime() - from.getTime())
            // convert the difference, which is in milliseconds into days and set the timePeriodOffset to that value
            customTimePeriodOffset = Math.floor(difference / (24 * 60 * 60 * 1000))
        }

        return {
            timestamp: filterBarValues.timestamp ? filterBarValues.timestamp?.toISOString() : undefined,
            timePeriodOffset: customTimePeriodOffset !== undefined ? customTimePeriodOffset : parseParamSelectFilterValue(filterBarValues.timePeriod, filters.timePeriod.values, filters.timePeriod.defaultValue),
            direction: filterBarValues.direction === undefined ? undefined : FilterDirection[filterBarValues.direction],
            startAt: Number(filterBarValues.startAt),
            orderBy: FilterOrder[FilterOrder.POPULARITY],
            includeSourceTypes: includeSourceTypes && includeSourceTypes.length > 0 ? includeSourceTypes : undefined,
            excludeSourceTypes: excludeSourceTypes && excludeSourceTypes.length > 0 ? excludeSourceTypes : undefined,
            includeSongTypes: includeSongTypes && includeSongTypes.length > 0 ? includeSongTypes : undefined,
            excludeSongTypes: excludeSongTypes && excludeSongTypes.length > 0 ? excludeSongTypes : undefined
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
        newValues: TrendingFilterBarValues,
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
        setFilterBarValuesLoaded(true)
        saveFilterValues({
            timePeriod: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'timePeriod')),
            includeSourceTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'includeSourceTypes')),
            excludeSourceTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'excludeSourceTypes')),
            includeSongTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'includeSongTypes')),
            excludeSongTypes: decodeMultiFilter(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'excludeSongTypes')),
            from: getDateSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'from')),
            timestamp: getDateSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'timestamp')),
            direction: getNumericSearchParam(pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'direction')),
            startAt: pickSongDefaultOrSearchParam(searchParams, defaultFilters, 'startAt'),
        }, true, true, false)
    }, [])

    // load view mode
    useEffect(() => {
        setViewMode(settings.rankingsViewMode)
    }, [settings.rankingsViewMode])

    return (
        <section className="flex flex-col w-full">
            <TrendingActiveFilterBar
                filters={filters}
                filterValues={filterBarValues}
                currentTimestamp={currentTimestampDate}
                setFilterValues={saveFilterValues}
                setRankingsViewMode={setRankingsViewMode}
                playlistUrl={youtubePlaylistUrl}
            />
            <Divider className="mb-5" />
            {error ? <RankingsApiError error={error} />
                : !loading && (rankingsResult == undefined || 0 >= rankingsResult.results.length) ? <h2 className="text-3xl font-bold text-center text-on-background">{langDict.search_no_results}</h2>
                    : rankingsResult == undefined ? <RankingsSkeleton elementCount={50} viewMode={rankingsViewMode} />
                        : <RankingsContainer viewMode={rankingsViewMode}>
                            <TransitionGroup component={null}>{rankingsResult.results.map(ranking => {
                                const song = ranking.song
                                const names = buildEntityNames(song.names)

                                const color = resolvedTheme == 'dark' ? song.darkColor : song.lightColor
                                return rankingsViewMode == RankingsViewMode.LIST ? (
                                    <RankingListItem
                                        key={song.id.toString()}
                                        href={`../song/${song.id}`}
                                        titleContent={<EntityName names={names} preferred={settingTitleLanguage} />}
                                        placement={ranking.placement}
                                        icon={song.thumbnail || song.maxresThumbnail}
                                        iconAlt={getEntityName(names, settingTitleLanguage)}
                                        imageDisplayMode={ImageDisplayMode.SONG}
                                        trailingTitleContent={<></>}
                                        supportingContent={
                                            <SongArtistsLabel
                                                artists={song.artists}
                                                categories={song.artistsCategories}
                                                preferredNameType={settingTitleLanguage}
                                                theme={resolvedTheme}
                                            />
                                        }
                                        color={color}
                                    />
                                ) : (
                                    <TransitioningRankingsGridItem
                                        key={song.id.toString()}
                                        href={`../song/${song.id}`}
                                        titleContent={<EntityName names={names} preferred={settingTitleLanguage} />}
                                        placement={ranking.placement}
                                        icon={song.thumbnail || song.maxresThumbnail}
                                        iconAlt={getEntityName(names, settingTitleLanguage)}
                                        imageDisplayMode={ImageDisplayMode.SONG}
                                        trailingTitleContent={<></>}
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