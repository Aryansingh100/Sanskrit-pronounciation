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

        console.log("STEP 1: Writing game-completions...");

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

        console.log(
            "STEP 1 SUCCESS: game-completions"
        );

        const dailyRecordId =
            `${currentUser.uid}_${GAME_ID}_${today}`;

        const dailyScoreRef = doc(
            db,
            LEADERBOARD_COLLECTION,
            dailyRecordId
        );

        console.log(
            "STEP 2: Reading daily leaderboard..."
        );

        const existingDaily =
            await getDoc(dailyScoreRef);

        console.log(
            "STEP 2 SUCCESS: Reading daily leaderboard"
        );

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

        console.log(
            "STEP 3: Writing daily leaderboard..."
        );

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

        console.log(
            "STEP 3 SUCCESS: Daily leaderboard"
        );

        const allTimeRecordId =
            `${currentUser.uid}_${GAME_ID}_alltime`;

        const allTimeScoreRef = doc(
            db,
            LEADERBOARD_COLLECTION,
            allTimeRecordId
        );

        console.log(
            "STEP 4: Reading all-time leaderboard..."
        );

        const existingAllTime =
            await getDoc(allTimeScoreRef);

        console.log(
            "STEP 4 SUCCESS: Reading all-time leaderboard"
        );

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

        console.log(
            "STEP 5: Writing all-time leaderboard..."
        );

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

        console.log(
            "STEP 5 SUCCESS: All-time leaderboard"
        );

        return true;

    } catch (error) {

        console.error(
            "Leaderboard submission failed:",
            error
        );

        console.error(
            "Permission error occurred during one of the steps above."
        );

        throw error;
    }
}