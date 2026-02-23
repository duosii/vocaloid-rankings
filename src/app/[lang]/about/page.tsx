import { Locale, getDictionary } from "@/localization"
import { Metadata } from "next"
import Markdown from "react-markdown"

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
        title: langDict.home_about,
    }
}

export default async function AboutPage(
    props: {
        params: Promise<{
            lang: Locale
        }>
    }
) {
    const params = await props.params;
    const markdown = await import(`@/localization/docs/${params.lang}/about.md`).then(module => module.default)

    return (
        <section className="flex flex-col gap-5 w-full min-h-screen max-w-4xl">
            <Markdown className='prose prose-md prose-material max-w-full'>{markdown}</Markdown>
        </section>
    )
}