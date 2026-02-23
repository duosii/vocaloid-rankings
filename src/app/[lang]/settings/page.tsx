import { Locale, getDictionary } from "@/localization"
import { Metadata } from "next"
import { SettingsSelectors } from "./settings-selectors"
import { Settings } from "."
import { cookies } from "next/headers"

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
        title: langDict.settings,
    }
}

export default async function AddSongPage(
    props: {
        params: Promise<{
            lang: Locale
        }>
    }
) {
    const params = await props.params;
    // get lang dict
    const langDict = await getDictionary(params.lang)

    // get settings
    const settings = new Settings(await cookies())

    return (
        <section className="flex flex-col gap-5 w-full min-h-screen max-w-4xl">
            <h1 className="font-bold md:text-5xl md:text-left text-4xl text-center w-full mb-5">{langDict.settings}</h1>

            <SettingsSelectors initialSettings={{
                titleLanguage: settings.titleLanguage,
                rankingsViewMode: settings.rankingsViewMode,
                theme: settings.rankingsViewMode,
                googleAnalytics: settings.googleAnalytics,
                language: settings.language
            }}/>
        </section>
    )
}