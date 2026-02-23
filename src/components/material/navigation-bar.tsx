'use client'
import { Locale } from "@/localization";
import { Icon } from "./icon";
import { NavLink } from "@/app/[lang]/layout";
import Link from "next/link";
import { useLocale } from "../providers/language-dictionary-provider";
import { usePathname } from "next/navigation";

export default function MobileNavbar(
    {
        lang,
        links
    }: {
        lang: Locale,
        links: NavLink[]
    }
) {
    const langDict = useLocale();
    const pathName = usePathname();

    return (
        <ul className="sticky flex bottom-0 left-0 w-full h-20 z-20 pt-3 pb-4 bg-surface-container-low sm:hidden box-border">
            {links.map(linkData => {
                const href = `/${lang}${linkData.href}`

                return (
                    <NavItem
                        key={linkData.href}
                        href={href}
                        icon={linkData.icon}
                        text={langDict[linkData.text]}
                        active={pathName === href}
                    />
                )
            })}
        </ul>
    )
}

function NavItem({
    href,
    icon,
    text,
    active
}: {
    href: string,
    icon: string,
    text: string,
    active: boolean
}) {
    return (
        <li className='flex-1'>
            <Link href={href} className='w-full h-full flex flex-col gap-1 items-center justify-center'>
                <div className={`h-8 w-16 flex items-center justify-center rounded-2xl transition-colors ${active ? 'bg-secondary-container text-on-primary-container' : 'hover:bg-secondary-container hover:text-on-primary-container'}`}>
                    <Icon icon={icon} className='text-inherit' />
                </div>
                <div className='text-on-surface text-sm'>{text}</div>
            </Link>
        </li>
    )
}