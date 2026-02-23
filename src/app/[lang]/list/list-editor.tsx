'use client'
import { InsertListActionResponse, insertListAction } from "@/app/actions/insertList";
import { ImageDisplayMode } from "@/components";
import EntityThumbnail from "@/components/entity-thumbnail";
import { GraphQLError } from "@/components/entity/graph-ql-api-error";
import { InputFilterElement } from "@/components/filter/input-filter";
import { SongSearchFilter } from "@/components/filter/song-search-filter";
import Image from "@/components/image";
import { LocalizedTextInput } from "@/components/input/localized-text-input";
import { Divider } from "@/components/material/divider";
import { FilledButton } from "@/components/material/filled-button";
import { Icon } from "@/components/material/icon";
import { IconButton } from "@/components/material/icon-button";
import { useLocale } from "@/components/providers/language-dictionary-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { RankingsSkeleton } from "@/components/rankings/rankings-skeleton";
import { Id, List, ListLocalizations } from "@/data/types";
import { buildEntityNames, graphClient } from "@/lib/api";
import { ApiSong } from "@/lib/api/types";
import { LanguageDictionaryKey, Locale, getEntityName } from "@/localization";
import { LangLocaleTokens } from "@/localization/DictionaryTokenMaps";
import { APIError, GraphQLResponseError, Result } from "graphql-hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RankingsViewMode } from "../rankings/types";

export interface ListValues {
    id: Id | null;
    songIds: Id[];
    names: ListLocalizations;
    descriptions: ListLocalizations;
    image: string | null;
}

const GET_SONGS = `
query GetSongs(
    $ids: [Int]!
) {
    songs(
        ids: $ids
    ) {
        id
        thumbnail
        averageColor
        names {
            original
            japanese
            english
            romaji
        }
    }
}
`

export function ListEditor(
    {
        list
    }: {
        list?: List
    }
) {
    // states
    const [listValues, setListValues] = useState({
        id: list?.id || null,
        songIds: list?.songIds || [] as Id[],
        names: list?.names || {} as ListLocalizations,
        descriptions: list?.names || {} as ListLocalizations,
        image: list?.image || null
    } as ListValues)
    const [formSubmitting, setFormSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const [loadingSongsData, setLoadingSongsData] = useState(false)
    const [songsDataLoadError, setSongsDataLoadError] = useState<APIError<GraphQLResponseError> | null>(null)

    // list songs' data
    const [songsData, setSongsData] = useState<{ [key: number]: ApiSong }>({});

    // settings
    const { settings } = useSettings()

    // import settings
    const settingTitleLanguage = settings.titleLanguage

    // language dictionary
    const langDict = useLocale()

    // router
    const router = useRouter()

    // functions
    const saveListValues = (
        newValues: ListValues
    ) => {
        setListValues({ ...newValues })
    }

    // generate language options
    const languageOptions: string[] = []
    const languageOptionsMap: { [key: number]: Locale } = {}

    // generate names & descriptions elements
    const nameElements: React.ReactNode[] = []
    const descriptionElements: React.ReactNode[] = []

    for (const locale in LangLocaleTokens) {
        const localizedName = langDict[LangLocaleTokens[locale as Locale]]
        languageOptionsMap[languageOptions.length] = locale as Locale
        languageOptions.push(localizedName)

        const nameValue = listValues.names[locale as Locale]
        if (nameValue !== undefined) {
            nameElements.push(
                <tr>
                    <td className="font-normal text-xl w-fit pr-5 pb-5">{localizedName}</td>
                    <td className="pb-5 w-full">
                        <InputFilterElement
                            type='text'
                            value={listValues.names[locale as Locale] || ''}
                            placeholder={langDict.list_names_placeholder}
                            defaultValue=""
                            onValueChanged={(newValue) => {
                                listValues.names[locale as Locale] = newValue
                                saveListValues(listValues)
                            }}
                            className="w-full"
                        />
                    </td>
                    <td className="pb-5 pl-3">
                        <IconButton
                            icon='delete'
                            onClick={event => {
                                // prevent the click form submitting the form
                                event.preventDefault()

                                listValues.names[locale as Locale] = undefined
                                saveListValues(listValues)
                            }}
                        />
                    </td>
                </tr>
            )
        }

        const descValue = listValues.descriptions[locale as Locale]
        if (descValue !== undefined) {
            descriptionElements.push(
                <tr>
                    <td className="font-normal text-xl w-fit pr-5 pb-5">{localizedName}</td>
                    <td className="pb-5 w-full">
                        <InputFilterElement
                            type='text'
                            value={listValues.descriptions[locale as Locale] || ''}
                            placeholder={langDict.list_descriptions_placeholder}
                            defaultValue=""
                            onValueChanged={(newValue) => {
                                listValues.descriptions[locale as Locale] = newValue
                                saveListValues(listValues)
                            }}
                            className="w-full"
                        />
                    </td>
                    <td className="pb-5 pl-3">
                        <IconButton
                            icon='delete'
                            onClick={event => {
                                // prevent the click form submitting the form
                                event.preventDefault()

                                listValues.descriptions[locale as Locale] = undefined
                                saveListValues(listValues)
                            }}
                        />
                    </td>
                </tr>
            )
        }
    }

    // load existing songs data
    useEffect(() => {
        // return if there are no songs to load
        if (0 > listValues.songIds.length || loadingSongsData) return;
        setLoadingSongsData(true)

        graphClient.request({
            query: GET_SONGS,
            variables: {
                ids: listValues.songIds
            }
        }).then((result: Result<any, any>) => {
            const error = result.error
            if (error) {
                setSongsDataLoadError(error)
            }

            for (const apiSong of result.data.songs) {
                songsData[apiSong.id] = apiSong
            }
            setSongsData({ ...songsData })
        })
            .catch(_ => { })
            .finally(() => setLoadingSongsData(false))
    }, [])

    return (
        <form
            className="flex flex-col gap-8 w-full min-h-screen"
            action={async () => {
                if (formSubmitting) return
                setFormSubmitting(true)
                const result: InsertListActionResponse = await insertListAction(listValues)

                const error = result.error
                setSubmitError(error ? langDict[error as LanguageDictionaryKey] || error : null)
                setFormSubmitting(false)

                const id = result.listId
                if (id) router.push(`./${id}`)
            }}
        >
            <section className="w-full flex gap-5 items-end">
                <h1 className="font-bold md:text-5xl md:text-left text-4xl flex-1">{langDict.list_create_title}</h1>
                <FilledButton text={langDict.list_save} disabled={formSubmitting} />
            </section>

            {submitError ? <h2 className="text-xl rounded-2xl font-semibold px-3 py-3 bg-error-container text-on-error-container">{submitError}</h2> : undefined}

            <Divider />

            {/* image */}
            <h2 className="font-semibold text-3xl">{langDict.list_image_title}</h2>
            <section className="flex flex-col gap-3">
                {listValues.image && URL.canParse(listValues.image)
                    ? <figure className="rounded-3xl overflow-hidden bg-surface-container w-full flex items-center justify-center relative">
                        <Image
                            className="absolute w-full opacity-30 blur-2xl object-cover flex items-center justify-center"
                            src={listValues.image}
                            alt={langDict.list_image_title}
                        />
                        <Image
                            className="z-10 w-full max-w-96 aspect-square object-cover flex items-center justify-center"
                            src={listValues.image}
                            alt={langDict.list_image_title}
                        />
                    </figure>
                    : <div className="w-full h-full aspect-square max-w-96 rounded-3xl bg-surface-container-low flex items-center justify-center">
                        <Icon className="text-surface-variant" icon='image' />
                    </div>}
                <InputFilterElement
                    type='url'
                    value={listValues.image || ''}
                    placeholder={langDict.list_image_placeholder}
                    className="w-full max-w-96"
                    defaultValue=""
                    onValueChanged={(newImage) => {
                        listValues.image = newImage
                        saveListValues(listValues)
                    }}
                />
            </section>

            <Divider />

            <section className="flex md:flex-row flex-col gap-10">

                {/* names */}
                <LocalizedTextInput
                    values={listValues.names}
                    placeholder={langDict.list_names_placeholder}
                    emptyText={langDict.list_names_required}
                    title={langDict.list_names_title}
                    onValueChanged={(key, newValue) => {
                        listValues.names[key] = newValue
                        saveListValues(listValues)
                    }}
                />

                {/* descriptions */}
                <LocalizedTextInput
                    values={listValues.descriptions}
                    placeholder={langDict.list_descriptions_placeholder}
                    emptyText={langDict.list_descriptions_required}
                    title={langDict.list_descriptions_title}
                    onValueChanged={(key, newValue) => {
                        listValues.descriptions[key] = newValue
                        saveListValues(listValues)
                    }}
                />


            </section>

            <Divider />

            {/* songs */}
            <section className="flex gap-5 items-end ">
                <h2 className="font-semibold text-3xl flex-1 h-fit">{langDict.list_songs_title}</h2>
                {/* Search */}
                <SongSearchFilter
                    name={''}
                    value={listValues.songIds}
                    placeholder={langDict.list_songs_search}
                    entityNames={[]}
                    onSongSelected={(newSongId, songData) => {
                        listValues.songIds.push(newSongId)
                        songsData[Number(newSongId)] = songData
                        saveListValues(listValues)
                    }}
                    onEntityNamesChanged={() => { }}
                />
            </section>
            {/* song items */}
            <ul className="flex flex-col gap-5">
                {songsDataLoadError !== null ? <GraphQLError error={songsDataLoadError} className="text-center" />
                    : loadingSongsData ? <RankingsSkeleton elementCount={5} viewMode={RankingsViewMode.LIST} />
                        : 0 >= listValues.songIds.length ? <h2 className="text-2xl text-center w-full my-5">{langDict.list_songs_empty}</h2>
                            : listValues.songIds.map(id => {
                                const data = songsData[Number(id)]
                                return data ? <SongListItem
                                    key={id.toString()}
                                    name={getEntityName(buildEntityNames(data.names), settingTitleLanguage)}
                                    thumbnail={data.thumbnail}
                                    averageColor={data.averageColor}
                                    onDelete={() => {
                                        listValues.songIds.splice(listValues.songIds.indexOf(id), 1)
                                        saveListValues(listValues)
                                    }}
                                /> : undefined
                            })
                }
            </ul>
        </form>
    )
}

function SongListItem(
    {
        key,
        name,
        thumbnail,
        averageColor,
        onDelete
    }: {
        key: string
        name: string
        thumbnail: string
        averageColor: string
        onDelete: () => void
    }
) {
    return <li key={key} className="py-2 px-2 rounded-2xl w-full bg-surface-container-low flex gap-4 items-center">
        <EntityThumbnail
            src={thumbnail}
            alt={name}
            width={50}
            height={50}
            imageDisplayMode={ImageDisplayMode.SONG}
            fillColor={averageColor}
        />
        <h4 className="text-xl font-semibold flex-1 ">{name}</h4>
        <IconButton
            icon='delete'
            onClick={onDelete}
        />
    </li>
}