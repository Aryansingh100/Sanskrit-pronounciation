import {
    db,
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    serverTimestamp
} from "../firebase-config";

const GAME_ID = "sanskritPronunciation";
const GAME_NAME = "Sanskrit Pronunciation";

const LEADERBOARD_COLLECTION = "leaderboard-zatamgame";

export async function postScore(
    currentUser,
    finalScore,
    timePlayedInSeconds
) {
    if (!currentUser) {
        return false;
    }

    try {
        const today = new Date()
            .toISOString()
            .split("T")[0];

        /*
         * --------------------------------
         * SAVE GAME COMPLETION
         * --------------------------------
         */

        await addDoc(
            collection(db, "game-completions"),
            {
                userId: currentUser.uid,
                playerName:
                    currentUser.displayName || "Player",
                email: currentUser.email || "",
                gameId: GAME_ID,
                gameName: GAME_NAME,
                score: finalScore,
                timePlayedInSeconds:
                timePlayedInSeconds,
                completedAt: serverTimestamp()
            }
        );

        /*
         * --------------------------------
         * DAILY SCORE
         * --------------------------------
         */

        const dailyRecordId =
            `${currentUser.uid}_${GAME_ID}_${today}`;

        const dailyScoreRef = doc(
            db,
            LEADERBOARD_COLLECTION,
            dailyRecordId
        );

        const existingDaily =
            await getDoc(dailyScoreRef);

        const existingDailyScore =
            existingDaily.exists()
                ? existingDaily.data().score || 0
                : 0;

        const existingDailyTime =
            existingDaily.exists()
                ? existingDaily.data()
                .timePlayedInSeconds || 0
                : 0;

        const newDailyScore =
            existingDailyScore + finalScore;

        const newDailyTime =
            existingDailyTime +
            timePlayedInSeconds;

        await setDoc(dailyScoreRef, {
            userId: currentUser.uid,
            playerName:
                currentUser.displayName || "Player",
            email: currentUser.email || "",
            photoURL:
                currentUser.photoURL || "",
            gameId: GAME_ID,
            gameName: GAME_NAME,
            score: newDailyScore,
            timePlayedInSeconds: newDailyTime,
            scoreDate: today,
            updatedAt: serverTimestamp()
        });

        /*
         * --------------------------------
         * ALL TIME SCORE
         * --------------------------------
         */

        const allTimeRecordId =
            `${currentUser.uid}_${GAME_ID}_alltime`;

        const allTimeScoreRef = doc(
            db,
            LEADERBOARD_COLLECTION,
            allTimeRecordId
        );

        const existingAllTime =
            await getDoc(allTimeScoreRef);

        const existingAllTimeScore =
            existingAllTime.exists()
                ? existingAllTime.data().score || 0
                : 0;

        const existingAllTimeTime =
            existingAllTime.exists()
                ? existingAllTime.data()
                .timePlayedInSeconds || 0
                : 0;

        const newAllTimeScore =
            existingAllTimeScore + finalScore;

        const newAllTimeTime =
            existingAllTimeTime +
            timePlayedInSeconds;

        await setDoc(allTimeScoreRef, {
            userId: currentUser.uid,
            playerName:
                currentUser.displayName || "Player",
            email: currentUser.email || "",
            photoURL:
                currentUser.photoURL || "",
            gameId: GAME_ID,
            gameName: GAME_NAME,
            score: newAllTimeScore,
            timePlayedInSeconds: newAllTimeTime,
            scoreDate: "all-time",
            updatedAt: serverTimestamp()
        });

        return true;

    } catch (error) {
        console.error(
            "Leaderboard submission failed:",
            error
        );

        throw error;
    }
}