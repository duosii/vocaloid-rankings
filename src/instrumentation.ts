export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs' && typeof window === 'undefined' && process.env.NODE_ENV === "production" ) {
        const { refreshAllSongsViews, insertSong, songExists } = await import("./data/songsData");
        const { getVocaDBRecentSongs } = await import("./lib/vocadb");
        
        // refresh views
        try {
            await refreshAllSongsViews()
        } catch (error) {
            console.error(error)
        }

        // console.log("Adding recent VocaDB songs...")
        // await getVocaDBRecentSongs()
        //     .then(async (songs) => {
        //         for (const song of songs) {
        //             if (!(await songExists(song.id))) await insertSong(song);
        //         }
        //     })
        //     .catch(error => console.log(`Error when getting recent VocaDB songs: ${error}`))
        //const { refreshAllSongsViews } = await import("./data/songsData");
        //refreshAllSongsViews().catch(error => console.log(`Error when refreshing every songs' views: ${error}`))
    }
}