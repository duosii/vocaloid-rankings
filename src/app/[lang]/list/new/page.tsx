import { Divider } from "@/components/material/divider";
import { UserAccessLevel } from "@/data/types";
import { getActiveSession, getAuthenticatedUser } from "@/lib/auth";
import { Locale, getDictionary } from "@/localization";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ListEditor } from "../list-editor";
import { CircularProgress } from "@/components/material/circular-progress";

export default async function NewListPage(
    props: {
        params: Promise<{
          lang: Locale
        }>
      }
) {
    // ensure that this page can be accessed by the active session
    const user = await getAuthenticatedUser(await cookies())

    if (!user || UserAccessLevel.EDITOR > user.accessLevel) return redirect('./')

    return (
        <ListEditor />
    )
}