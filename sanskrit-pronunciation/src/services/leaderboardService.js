import {
    db,
    doc,
    getDoc,
    setDoc,
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

    // Get today's date
    const today = new Date()
        .toISOString()
        .split("T")[0];

    // One leaderboard record per user,
    // per game, per day.
    const recordId =
        `${currentUser.uid}_${GAME_ID}_${today}`;

    const scoreRef = doc(
        db,
        LEADERBOARD_COLLECTION,
        recordId
    );

    // Check whether this player already has
    // a score for this game today.
    const existing = await getDoc(scoreRef);

    if (
        existing.exists() &&
        (existing.data().score || 0) >= finalScore
    ) {
        return false;
    }

    // Save the new best score.
    await setDoc(scoreRef, {
        userId: currentUser.uid,

        playerName:
            currentUser.displayName || "Player",

        email:
            currentUser.email || "",

        photoURL:
            currentUser.photoURL || "",

        gameId: GAME_ID,

        gameName: GAME_NAME,

        score: finalScore,

        timePlayedInSeconds:
        timePlayedInSeconds,

        scoreDate: today,

        updatedAt: serverTimestamp()
    });

    return true;
}