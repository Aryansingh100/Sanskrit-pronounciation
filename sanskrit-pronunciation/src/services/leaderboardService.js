import {
    db,
    auth,
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    serverTimestamp,
    updateDoc
} from "../firebase-config";

const GAME_ID = "sanskritPronunciation";
const GAME_NAME = "Sanskrit Pronunciation";
const DAILY_BONUS_START = 20;
const DAILY_BONUS_MIDDLE = 30;
const DAILY_BONUS_MAX = 40;

const LEADERBOARD_COLLECTION =
    "leaderboard-zatamgame";

export async function postScore(
    currentUser,
    finalScore,
    timePlayedInSeconds
) {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
        console.error(
            "No Firebase user is currently signed in."
        );

        return false;
    }

    try {

        const today = new Date()
            .toISOString()
            .split("T")[0];

        const yesterday = new Date();

        yesterday.setUTCDate(
            yesterday.getUTCDate() - 1
        );

        const yesterdayString =
            yesterday.toISOString().split("T")[0];

        let newDailyStreak = existingDailyStreak;
        let dailyBonus = 0;
        let dailyBonusEarned = false;

        // DAILY BONUS

        if (lastPlayedDate === today) {

            // Player already completed a game today.
            // Do not give another daily bonus.

            newDailyStreak = existingDailyStreak;

            console.log(
                "Daily bonus already received today."
            );

        } else {

            dailyBonusEarned = true;

            if (
                lastPlayedDate === yesterdayString
            ) {

                newDailyStreak =
                    existingDailyStreak + 1;

            } else {

                // First day or player missed a day
                newDailyStreak = 1;
            }


            // =========================================
            // DETERMINE BONUS AMOUNT
            // =========================================

            if (newDailyStreak >= 6) {

                dailyBonus = DAILY_BONUS_MAX;

            } else if (newDailyStreak >= 3) {

                dailyBonus = DAILY_BONUS_MIDDLE;

            } else {

                dailyBonus = DAILY_BONUS_START;
            }


            console.log(
                "Daily streak:",
                newDailyStreak
            );

            console.log(
                "Daily bonus:",
                dailyBonus
            );
        }

        // =========================================
        // DAILY LEADERBOARD
        // =========================================

        const dailyRecordId =
            `${currentUser.uid}_${GAME_ID}_${today}`;

        const dailyScoreRef = doc(
            db,
            LEADERBOARD_COLLECTION,
            dailyRecordId
        );

        console.log(
            "STEP 1: Reading daily leaderboard..."
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

        console.log(
            "STEP 2: Writing daily leaderboard..."
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
            "STEP 2 SUCCESS: Daily leaderboard"
        );


        // =========================================
        // ALL-TIME LEADERBOARD
        // =========================================

        const allTimeRecordId =
            `${currentUser.uid}_${GAME_ID}_alltime`;

        const allTimeScoreRef = doc(
            db,
            LEADERBOARD_COLLECTION,
            allTimeRecordId
        );

        console.log(
            "STEP 3: Reading all-time leaderboard..."
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

        const existingStreak =
            existingAllTime.exists()
                ? existingAllTime.data().streak || 0
                : 0;

        const existingDailyStreak =
            existingAllTime.exists()
                ? existingAllTime.data().dailyStreak || 0
                : 0;

        const lastPlayedDate =
            existingAllTime.exists()
                ? existingAllTime.data().lastPlayedDate || null
                : null;

        const newAllTimeScore =
            existingAllTimeScore +
            finalScore;

        const newAllTimeTime =
            existingAllTimeTime +
            timePlayedInSeconds;

        // =========================================
        // CALCULATE NEW STREAK
        // =========================================

        let newStreak =
            existingStreak + 1;

        const streakCompleted =
            newStreak === 3;

        if (streakCompleted) {
            newStreak = 0;
        }

        console.log(
            "Previous streak:",
            existingStreak
        );

        console.log(
            "New streak:",
            newStreak
        );

        console.log(
            "Streak completed:",
            streakCompleted
        );


        // =========================================
        // WRITE ALL-TIME SCORE
        // =========================================

        console.log(
            "STEP 4: Writing all-time leaderboard..."
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
            streak: newStreak,
            dailyStreak: newDailyStreak,
            lastPlayedDate: dailyBonusEarned ? today : lastPlayedDate,
            updatedAt: serverTimestamp()
        });

        console.log(
            "STEP 4 SUCCESS: All-time leaderboard"
        );

        // =========================================
        // DAILY BONUS
        // =========================================

        if (dailyBonusEarned) {

            console.log(
                `Daily bonus earned: +${dailyBonus}`
            );

            await updateDoc(
                dailyScoreRef,
                {
                    score:
                        newDailyScore +
                        dailyBonus
                }
            );

            await updateDoc(
                allTimeScoreRef,
                {
                    score:
                        newAllTimeScore +
                        dailyBonus,

                    dailyStreak:
                    newDailyStreak,

                    lastPlayedDate:
                    today
                }
            );

            console.log(
                "Daily bonus successfully added:",
                dailyBonus
            );
        }
        // =========================================
        // STREAK BONUS
        // =========================================

        if (streakCompleted) {

            console.log(
                "3 GAME STREAK! Adding +30 bonus."
            );

            await updateDoc(
                dailyScoreRef,
                {
                    score: newDailyScore + 30
                }
            );

            await updateDoc(
                allTimeScoreRef,
                {
                    score: newAllTimeScore + 30,
                    streak: 0
                }
            );

            console.log(
                "STEP 5 SUCCESS: +30 streak bonus"
            );
        }

        return true;

    } catch (error) {

        console.error(
            "Leaderboard submission failed:",
            error
        );

        console.error(
            "Error code:",
            error?.code
        );

        console.error(
            "Error message:",
            error?.message
        );

        throw error;
    }
}