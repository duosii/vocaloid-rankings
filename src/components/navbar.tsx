'use client'
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { MouseEventHandler, useState } from 'react'
import { Icon } from './material/icon'
import { IconButton } from "./material/icon-button"
import { useLocale } from './providers/language-dictionary-provider'
import { ModalDrawer } from './transitions/modal-drawer'
import { Logo } from "./logo"
import { NavLink } from "@/app/[lang]/layout"

export default function Navbar(
    {
        lang,
        links
    }: {
        lang: string,
        links: NavLink[]
    }
) {
    const langDict = useLocale()

    return (
        <header className="z-50 w-full h-15 px-7 py-2 box-border sticky top-0 backdrop-blur backdrop-saturate-200 before:w-full before:h-full before:absolute bg-[linear-gradient(var(--md-sys-color-background),transparent)] before:bg-background before:opacity-80 before:z-40 before:top-0 before:left-0">
            {/* nav drawer */}
            <nav className='z-40 relative w-full h-full flex items-center gap-5 m-auto'>
                <ul className='flex-1 flex items-center justify-start gap-5'>

                    {/* favicon */}
                    <Link href={`/${lang}`}>
                        <Logo />
                    </Link>

                    {/* nav links */}

                    <div key='nav-links'>
                        <ul className='sm:flex hidden gap-5'>
                            {
                                links.map(linkData => <NavItem
                                    key={linkData.href}
                                    href={`/${lang}${linkData.href}`}
                                    text={langDict[linkData.text]}
                                />)
                            }
                        </ul>
                    </div>

                </ul>
                {/* search bar */}
                {/* <SearchBar className='min-w-[360px] max-w-[420px] lg:flex hidden' placeholder={langDict.search_hint} /> */}

                {/* settings button */}
                <IconButton icon='settings' className='flex' href={`/${lang}/settings`} />
            </nav>
        </header>
    )
}

function NavItem({
    href,
    text
}: {
    href: string,
    text: string
}) {
    return (
        <li key={text}>
            <Link href={href} className='text-on-background bg-transparent rounded-lg bold text-base font-bold box-border p-[5px] hover:text-primary transition-colors'>{text}</Link>
        </li>
    )
}