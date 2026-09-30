import { useState } from "react";

import { postScore } from "../services/leaderboardService";

export function useLeaderboard(user) {
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const submitLeaderboardScore = async (
        score,
        timePlayedInSeconds
    ) => {

        // User must be logged in
        if (!user) {
            setMessage(
                "Please sign in before submitting your score."
            );

            return false;
        }

        setSubmitting(true);
        setMessage("");

        try {

            const updated = await postScore(
                user,
                score,
                timePlayedInSeconds
            );

            if (updated) {
                setMessage(
                    "Score added to the leaderboard!"
                );
            }

            return updated;

        } catch (error) {

            console.error(
                "FAILED LEADERBOARD SUBMISSION"
            );

            console.error(
                "Error object:",
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

            setMessage(
                "Could not submit score. Please try again."
            );

            return false;

        } finally {

            setSubmitting(false);

        }
    };

    const clearLeaderboardMessage = () => {
        setMessage("");
    };

    return {
        leaderboardMessage: message,
        submittingScore: submitting,
        submitLeaderboardScore,
        clearLeaderboardMessage
    };
}