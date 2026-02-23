'use client'
import { ImageDisplayMode } from "@/components"
import { EntityName } from "@/components/formatters/entity-name"
import { Divider } from "@/components/material/divider"
import { useLocale } from "@/components/providers/language-dictionary-provider"
import { RankingsApiError } from "@/components/rankings/rankings-api-error"
import { RankingsContainer } from "@/components/rankings/rankings-container"
import { RankingsItemTrailing, RankingsItemTrailingMode } from "@/components/rankings/rankings-item-trailing"
import { RankingListItem } from "@/components/rankings/rankings-list-item"
import { RankingsPageSelector } from "@/components/rankings/rankings-page-selector"
import { RankingsSkeleton } from "@/components/rankings/rankings-skeleton"
import { TransitioningRankingsGridItem } from "@/components/rankings/transitioning-rankings-grid-item"
import { ArtistCategory, ArtistType, FilterDirection, FilterOrder, SongType, SourceType } from "@/data/types"
import { GET_ARTIST_RANKINGS, buildEntityNames, graphClient } from "@/lib/api"
import { ApiArtist, ApiArtistRankingsFilterResult } from "@/lib/api/types"
import { buildFuzzyDate } from "@/lib/utils"
import { getEntityName } from "@/localization"
import { Result, useQuery } from "graphql-hooks"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { TransitionGroup } from "react-transition-group"
import { useSettings } from "../../../components/providers/settings-provider"
import { ArtistRankingsActiveFilterBar } from "./artist-rankings-filter-bar"
import { ArtistRankingsFilterBarValues, ArtistRankingsFilters, ArtistRankingsFiltersValues, EntityNames, FilterType, InputFilter, RankingsViewMode, SongRankingsFilterBarValues } from "./types"
import { buildRankingsQuery, decodeBoolean, decodeMultiFilter, encodeBoolean, encodeMultiFilter, getDateSearchParam, getNumericSearchParam, getRankingsItemTrailingSupportingText, parseParamSelectFilterValue, pickArtistDefaultOrSearchParam } from "./utils"
import { useSearchParams } from "next/navigation"

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

export function ArtistRankingsList(
    {
        href,
        filters,
        defaultFilters,
        currentTimestamp,
        viewMode,
        category
    }: {
        href: string
        filters: ArtistRankingsFilters
        defaultFilters: ArtistRankingsFiltersValues
        currentTimestamp: string
        viewMode: RankingsViewMode
        category: ArtistCategory
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
    let [filterBarValuesLoaded, setFilterBarValuesLoaded] = useState(false)
    let [filterBarValues, setFilterValues] = useState<ArtistRankingsFilterBarValues>({});

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
        const releaseYear = filterBarValues.releaseYear
        const releaseMonth = filterBarValues.releaseMonth
        const releaseDay = filterBarValues.releaseDay

        const songPublishYear = filterBarValues.songPublishYear
        const songPublishMonth = filterBarValues.songPublishMonth
        const songPublishDay = filterBarValues.songPublishDay

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
            includeArtistTypes: includeArtistTypes && includeArtistTypes.length > 0 ? includeArtistTypes : filters.includeArtistTypes.defaultValue?.map(value => ArtistType[value]),
            excludeArtistTypes: excludeArtistTypes && excludeArtistTypes.length > 0 ? excludeArtistTypes : undefined,
            artistCategory: ArtistCategory[category],
            songPublishDate: (songPublishYear || songPublishMonth || songPublishDay) ? buildFuzzyDate(songPublishYear, songPublishMonth, songPublishDay) : undefined,
            publishDate: (releaseYear || releaseMonth || releaseDay) ? buildFuzzyDate(releaseYear, releaseMonth, releaseDay) : undefined,
            orderBy: filterBarValues.orderBy == undefined ? undefined : FilterOrder[filters.orderBy.values[filterBarValues.orderBy].value || FilterOrder.VIEWS],
            includeArtists: filterBarValues.includeArtists && filterBarValues.includeArtists.length > 0 ? [...filterBarValues.includeArtists] : undefined, // unpack artists into new table so that the reference is different
            excludeArtists: filterBarValues.excludeArtists && filterBarValues.excludeArtists.length > 0 ? [...filterBarValues.excludeArtists] : undefined,
            includeCoArtistsOf: filterBarValues.includeCoArtistsOf && filterBarValues.includeCoArtistsOf.length > 0 ? [...filterBarValues.includeCoArtistsOf] : undefined,
            combineSimilarArtists: filterBarValues.combineSimilarArtists,
            singleVideo: filterBarValues.singleVideo,
            minViews: filterBarValues.minViews ? Number(filterBarValues.minViews) : undefined,
            maxViews: filterBarValues.maxViews ? Number(filterBarValues.maxViews) : undefined,
            search: filterBarValues.search == '' ? undefined : filterBarValues.search,
            direction: filterBarValues.direction === undefined ? undefined : FilterDirection[filterBarValues.direction],
            startAt: Number(filterBarValues.startAt)
        }
    }

    // import graphql context
    const [queryVariables, setQueryVariables] = useState(getQueryVariables)
    const { loading, error, data } = useQuery(GET_ARTIST_RANKINGS, {
        variables: queryVariables,
        skip: !filterBarValuesLoaded
    })
    const rankingsResult = data?.artistRankings as ApiArtistRankingsFilterResult | undefined

    // function for saving filter values & updating the UI with the new values.
    function saveFilterValues(
        newValues: ArtistRankingsFilterBarValues,
        refresh: boolean = true,
        merge: boolean = true,
        setParams: boolean = true // whether to set the query parameters or not
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
            search: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'search'),
            timePeriod: getNumericSearchParam(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'timePeriod')),
            songPublishYear: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'songPublishYear'),
            songPublishMonth: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'songPublishMonth'),
            songPublishDay: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'songPublishDay'),
            releaseYear: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'releaseYear'),
            releaseMonth: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'releaseMonth'),
            releaseDay: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'releaseDay'),
            includeSourceTypes: decodeMultiFilter(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'includeSourceTypes')),
            excludeSourceTypes: decodeMultiFilter(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'excludeSourceTypes')),
            includeSongTypes: decodeMultiFilter(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'includeSongTypes')),
            excludeSongTypes: decodeMultiFilter(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'excludeSongTypes')),
            includeArtistTypes: decodeMultiFilter(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'includeArtistTypes')),
            excludeArtistTypes: decodeMultiFilter(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'excludeArtistTypes')),
            minViews: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'minViews'),
            maxViews: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'maxViews'),
            orderBy: getNumericSearchParam(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'orderBy')),
            from: getDateSearchParam(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'from')),
            timestamp: getDateSearchParam(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'timestamp')),
            singleVideo: decodeBoolean(getNumericSearchParam(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'singleVideo'))),
            includeArtists: decodeMultiFilter(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'includeArtists')),
            excludeArtists: decodeMultiFilter(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'excludeArtists')),
            includeCoArtistsOf: decodeMultiFilter(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'includeCoArtistsOf')),
            combineSimilarArtists: decodeBoolean(getNumericSearchParam(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'combineSimilarArtists'))),
            direction: getNumericSearchParam(pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'direction')),
            startAt: pickArtistDefaultOrSearchParam(searchParams, defaultFilters, 'startAt')
        }, true, true, false)
    }, [])

    // load entity names map
    useEffect(() => {
        const artists = [...(filterBarValues.includeArtists || []), ...(filterBarValues.excludeArtists || []), ...(filterBarValues.includeCoArtistsOf || [])]
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

    const filterMode = filters.orderBy.values[filterBarValues.orderBy || filters.orderBy.defaultValue].value || RankingsItemTrailingMode.VIEWS

    return (
        <section className="flex flex-col w-full">
            <ArtistRankingsActiveFilterBar
                filters={filters}
                filterValues={filterBarValues}
                currentTimestamp={currentTimestampDate}
                setFilterValues={saveFilterValues}
                setRankingsViewMode={setRankingsViewMode}
                entityNames={entityNames}
                setEntityNames={newNames => setEntityNames({ ...newNames })}
            />
            <Divider className="mb-5" />
            {error ? <RankingsApiError error={error} />
                : !loading && filterBarValuesLoaded && (rankingsResult == undefined || 0 >= rankingsResult.results.length) ? <h2 className="text-3xl font-bold text-center text-on-background">{langDict.search_no_results}</h2>
                    : rankingsResult == undefined ? <RankingsSkeleton elementCount={50} viewMode={rankingsViewMode} />
                        : <RankingsContainer viewMode={rankingsViewMode}>
                            <TransitionGroup component={null}>{rankingsResult.results.map(ranking => {
                                const artist = ranking.artist
                                const names = buildEntityNames(artist.names)

                                const color = resolvedTheme == 'dark' ? artist.darkColor : artist.lightColor

                                const trailing = <RankingsItemTrailing
                                    mode={filterMode}
                                    value={ranking.views}
                                    publishDate={artist.publishDate}
                                    additionDate={artist.additionDate}
                                />

                                const trailingSupporting = getRankingsItemTrailingSupportingText(filterMode, langDict.rankings_views, langDict.rankings_song_count, langDict.rankings_publish_date, langDict.rankings_addition_date)

                                return rankingsViewMode == RankingsViewMode.LIST ? (
                                    <RankingListItem
                                        key={artist.id.toString()}
                                        href={`../artist/${artist.id}`}
                                        titleContent={<EntityName names={names} preferred={settingTitleLanguage} />}
                                        placement={ranking.placement}
                                        icon={artist.thumbnails.small || artist.thumbnails.medium || artist.thumbnails.original}
                                        iconAlt={getEntityName(names, settingTitleLanguage)}
                                        imageDisplayMode={ImageDisplayMode.VOCALIST}
                                        trailingTitleContent={trailing}
                                        trailingSupporting={trailingSupporting}
                                        color={color}
                                    />
                                ) : (
                                    <TransitioningRankingsGridItem
                                        key={artist.id.toString()}
                                        href={`../artist/${artist.id}`}
                                        titleContent={<EntityName names={names} preferred={settingTitleLanguage} />}
                                        placement={ranking.placement}
                                        icon={artist.thumbnails.medium || artist.thumbnails.original}
                                        iconAlt={getEntityName(names, settingTitleLanguage)}
                                        imageDisplayMode={ImageDisplayMode.VOCALIST}
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