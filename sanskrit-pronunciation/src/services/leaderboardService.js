import {
    db,
    doc,
    collection,
    serverTimestamp,
    writeBatch,
    increment
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

    const today = new Date().toISOString().split("T")[0];

    // Daily leaderboard record
    const dailyRecordId = `${currentUser.uid}_${GAME_ID}_${today}`;
    const dailyScoreRef = doc(
        db,
        LEADERBOARD_COLLECTION,
        dailyRecordId
    );

    // All time leaderboard record
    const allTimeRecordId = `${currentUser.uid}_${GAME_ID}_alltime`;
    const allTimeScoreRef = doc(
        db,
        LEADERBOARD_COLLECTION,
        allTimeRecordId
    );

    // Record of this completed game
    const completionRef = doc(
        collection(db, "game-completions")
    );

    // Use a batch so all three writes happen together.
    const batch = writeBatch(db);

    // Save individual game completion
    batch.set(completionRef, {
        userId: currentUser.uid,
        playerName: currentUser.displayName || "Player",
        email: currentUser.email || "",
        gameId: GAME_ID,
        gameName: GAME_NAME,
        score: finalScore,
        timePlayedInSeconds: timePlayedInSeconds,
        completedAt: serverTimestamp()
    });

    // Add this game's score to today's total
    batch.set(
        dailyScoreRef,
        {
            userId: currentUser.uid,
            playerName: currentUser.displayName || "Player",
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || "",
            gameId: GAME_ID,
            gameName: GAME_NAME,
            score: increment(finalScore),
            timePlayedInSeconds: increment(timePlayedInSeconds),
            scoreDate: today,
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );

    // Add this game's score to the player's all time total
    batch.set(
        allTimeScoreRef,
        {
            userId: currentUser.uid,
            playerName: currentUser.displayName || "Player",
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || "",
            gameId: GAME_ID,
            gameName: GAME_NAME,
            score: increment(finalScore),
            timePlayedInSeconds: increment(timePlayedInSeconds),
            scoreDate: "all-time",
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );

    await batch.commit();

    return true;
}