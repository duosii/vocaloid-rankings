'use server'

import { insertList } from "@/data/songsData"
import { Id, UserAccessLevel } from "@/data/types"
import { getAuthenticatedUser } from "@/lib/auth"
import { LanguageDictionaryKey, Locale } from "@/localization"
import { cookies } from "next/headers"
import { ListValues } from "../[lang]/list/list-editor"
import { LangLocaleTokens } from "@/localization/DictionaryTokenMaps"
import { getImageMostVibrantColor } from "@/lib/material/material"
import { argbFromRgb, hexFromArgb } from "@material/material-color-utilities"
import { Palette } from "@/lib/material/colorthief"

export interface InsertListActionResponse {
    error?: LanguageDictionaryKey | string,
    listId?: Id
}

export async function insertListAction(
    listValues: ListValues
): Promise<InsertListActionResponse> {
    try {
        
        const user = await getAuthenticatedUser(await cookies())

        if (!user || UserAccessLevel.EDITOR > user.accessLevel) throw new Error('Unauthorized');

        // validate that image was provided
        if (listValues.image === null) throw new Error('list_error_missing_image');

        // validate that at least one name/description was provided
        let nameFound = false
        let descriptionFound = false

        for (const locale in LangLocaleTokens) {
            const name = listValues.names[locale as Locale]
            const desc = listValues.descriptions[locale as Locale]

            nameFound = !nameFound ? name !== undefined : nameFound
            descriptionFound = !descriptionFound ? desc !== undefined : descriptionFound
        }
        if (!nameFound) throw new Error('list_names_required');
        if (!descriptionFound) throw new Error('list_descriptions_required');

        // get average color
        const vibrantColor = await getImageMostVibrantColor(listValues.image)
            .catch(_ => [255, 255, 255] as Palette)

        const newList = await insertList({
            created: new Date(),
            lastUpdated: new Date(),
            songIds: listValues.songIds,
            names: listValues.names,
            descriptions: listValues.descriptions,
            image: listValues.image,
            averageColor: hexFromArgb(argbFromRgb(...vibrantColor)) // convert the palette returned by getImageMostVibrantColor into hex.
        })

        return {
            listId: newList.id
        }
    } catch (error: any) {
        if (error instanceof Error) {
            return {
                error: error.message as LanguageDictionaryKey
            }
        } else {
            return {
                error: String(error)
            }
        }
    }
}