import { Icon } from "../material/icon"

export function FullFilterElement(
    {
        name,
        icon,
        nameTrailing,
        children,
        className = ''
    }: {
        name?: string
        icon?: string
        nameTrailing?: React.ReactNode
        children?: React.ReactNode
        shrink?: boolean
        className?: string
    }
) {
    return (
        <li key={name} className={`h-fit flex flex-col font-bold ${className}`}>
            {name || nameTrailing ? <div className="flex gap-3 justify-end items-end mb-2">
                <div className="flex gap-2 items-center flex-1">
                    {icon === undefined ? undefined : <Icon className="text-on-surface-variant text-lg" icon={icon} />}
                    <h3 className="text-on-surface-variant text-lg">{name}</h3>
                </div>
                {nameTrailing}
            </div> : undefined}
            {children}
        </li>
    )
}