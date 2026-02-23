import { MouseEvent, useState } from "react";
import { InputFilterElement } from "../filter/input-filter";
import { SelectFilterElement } from "../filter/select-filter";
import { FilledTonalIconButton } from "../material/filled-tonal-icon-button";
import { LangLocaleTokens } from "@/localization/DictionaryTokenMaps";
import { useLocale } from "../providers/language-dictionary-provider";
import { Locale } from "@/localization";
import { ListLocalizations } from "@/data/types";
import { IconButton } from "../material/icon-button";
import { FilledTonalButton } from "../material/filled-tonal-button";

export function LocalizedTextInput(
    {
        values,
        placeholder,
        emptyText,
        onValueChanged,
        title
    }: {
        values: ListLocalizations
        placeholder: string
        emptyText: string
        onValueChanged: (locale: Locale, newValue?: string) => void
        title?: string
    }
) {
    const [textInputValue, setTextInputValue] = useState('')
    const [languageOption, setLanguageOption] = useState(0)

    // import language dictionary
    const langDict = useLocale()

    // generate language options
    const languageLocalizedOptions: string[] = []
    const languageOptions: Locale[] = []

    // functions
    const addLocalizedValue = (event: MouseEvent) => {
        // prevent the click form submitting the form
        event.preventDefault()

        // do not submit if nameTextInputValue is empty
        if (textInputValue === '') return;

        // set the value in the list values dictionary
        onValueChanged(languageOptions[languageOption], textInputValue)

        // reset values
        setTextInputValue('')
        setLanguageOption(0)
    }

    // generate elements
    const localizedTextElements: React.ReactNode[] = []

    for (const locale in LangLocaleTokens) {
        const localizedName = langDict[LangLocaleTokens[locale as Locale]]

        languageOptions.push(locale as Locale)
        languageLocalizedOptions.push(localizedName)

        const value = values[locale as Locale]
        if (value !== undefined) {
            localizedTextElements.push(
                <tr>
                    <td className="font-normal text-xl w-fit pr-5 pb-5 whitespace-nowrap">{localizedName}</td>
                    <td className="pb-5 w-full">
                        <InputFilterElement
                            type='text'
                            value={value || ''}
                            placeholder={langDict.list_names_placeholder}
                            defaultValue=""
                            onValueChanged={(newValue) => onValueChanged(locale as Locale, newValue)}
                            className="w-full"
                        />
                    </td>
                    <td className="pb-5 pl-3">
                        <IconButton
                            icon='delete'
                            onClick={event => {
                                // prevent the click form submitting the form
                                event.preventDefault()

                                onValueChanged(locale as Locale, undefined)
                            }}
                        />
                    </td>
                </tr>
            )
        }
    }

    return (
        <section className="w-full flex flex-col gap-5">

            <h2 className="font-semibold text-3xl">{title}</h2>

            {/* creator */}
            <header className="flex md:flex-row flex-col items-end gap-3 p-3 bg-surface-container-lowest rounded-3xl">
                <InputFilterElement
                    type='text'
                    value={textInputValue}
                    placeholder={placeholder}
                    defaultValue=""
                    onValueChanged={newValue => setTextInputValue(newValue)}
                    className="w-full"
                />
                <SelectFilterElement
                    value={languageOption}
                    defaultValue={0}
                    options={languageLocalizedOptions}
                    className="md:w-fit w-full"
                    onValueChanged={(newValue) => setLanguageOption(newValue)}
                />
                <FilledTonalIconButton
                    icon='add'
                    className="md:flex hidden"
                    onClick={event => addLocalizedValue(event)}
                />
                <FilledTonalButton
                    icon='add'
                    text={'Add'}
                    className="md:hidden flex"
                    onClick={event => addLocalizedValue(event)}
                />
            </header>

            {/* Elements */}
            {localizedTextElements.length > 0
                ? <table className="table-cell"><tbody>{localizedTextElements}</tbody></table>
                : <p className="text-xl text-center">{emptyText}</p>
            }
        </section>
    )

}