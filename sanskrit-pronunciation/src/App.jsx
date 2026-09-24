import { useState } from "react";
import "./App.css";

import { useAuth } from "./hooks/useAuth";
import { useLeaderboard } from "./hooks/useLeaderboard";
import AuthPanel from "./components/auth/AuthPanel";

function App() {
  const { user, signOutUser } = useAuth();

  const [currentWord, setCurrentWord] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [completed, setCompleted] = useState(false);

  const [score, setScore] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(() => Date.now());
  const [timePlayedInSeconds, setTimePlayedInSeconds] = useState(0);

  const [showAuth, setShowAuth] = useState(false);

  const {
    leaderboardMessage,
    submittingScore,
    submitLeaderboardScore
  } = useLeaderboard(user);

  /*
   * ============================================================
   * GAME WORDS
   * ============================================================
   */

  const words = [
    {
      sanskrit: "सुप्रभातम्",
      meaning: "Good morning",
      audio: "/audio/suprabhatam.MP3",
      recognitionLang: "hi-IN",

      accepted: [
        "सुप्रभातम्",
        "सुप्रभातम",
        "सुप्रभात",
        "suprabhatam",
        "suprabhat",
        "su prabhatam",
        "su prabhat"
      ]
    },

    {
      sanskrit: "धन्यवादः",
      meaning: "Thank you",
      audio: "/audio/dhanyavadah.MP3",
      recognitionLang: "hi-IN",

      accepted: [
        "धन्यवादः",
        "धन्यवाद",
        "dhanyavadah",
        "dhanyavada",
        "dhanyavad"
      ]
    },

    {
      sanskrit: "स्वागतम् ।",
      meaning: "Welcome",
      audio: "/audio/swagatam.MP3",
      recognitionLang: "hi-IN",

      accepted: [
        "स्वागतम्",
        "स्वागतम",
        "स्वागतं",
        "स्वागत",
        "swagatam",
        "swagat",
        "swaagatam",
        "swāgatam"
      ]
    },

    {
      sanskrit: "चिन्ता मास्तु ।",
      meaning: "Don't worry",
      audio: "/audio/chinta-mastu.MP3",
      recognitionLang: "hi-IN",

      accepted: [
        "चिन्ता मास्तु",
        "चिंता मास्तु",
        "चिन्ता मास् तु",
        "चिंता मास् तु",

        "chinta mastu",
        "chintā māstu",
        "chinta maastu",
        "chinta mastoo"
      ]
    },

    {
      sanskrit: "भवतः नाम किं ?",
      meaning: "What is your name? (masc.)",
      audio: "/audio/bhavatah-nama-kim.MP3",
      recognitionLang: "hi-IN",

      accepted: [
        "भवतः नाम किं",
        "भवतः नाम किम्",
        "भवतः नाम किम",
        "भवतो नाम किं",
        "भवतो नाम किम्",

        "bhavatah nama kim",
        "bhavataha nama kim",
        "bhavato nama kim"
      ]
    }
  ];

  const word = words[currentWord];

  /*
   * ============================================================
   * NORMALIZE TEXT
   * ============================================================
   */

  const normalizeText = (text) => {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[।.,!?]/g, "")
        .replace(/\s+/g, " ");
  };

  /*
   * ============================================================
   * PLAY MP3
   * ============================================================
   */

  const playAudio = () => {
    setError("");

    try {
      const audio = new Audio(word.audio);

      audio.play().catch(() => {
        setError("The audio could not be played.");
      });
    } catch (error) {
      setError("There was a problem playing the audio.");
    }
  };

  /*
   * ============================================================
   * CALCULATE HOW MUCH OF THE ANSWER WAS RECOGNIZED
   * ============================================================
   *
   * 100%:
   * Entire answer matches.
   *
   * 80%:
   * At least 80% of the answer is recognized.
   *
   * 40%:
   * At least 2 meaningful characters/sounds are recognized.
   *
   * 0%:
   * Fewer than 2 meaningful characters/sounds match.
   *
   * IMPORTANT:
   * This is NOT fuzzy matching.
   * We compare characters in the normalized strings.
   * ============================================================
   */

  const calculateMatchPercentage = (spokenText, targetText) => {
    const spoken = normalizeText(spokenText);
    const target = normalizeText(targetText);

    if (!spoken || !target) {
      return {
        percentage: 0,
        correctCharacters: 0,
        matchedWords: 0,
        totalWords: 0
      };
    }

    // Exact match
    if (spoken === target) {
      const totalWords = target.split(" ").length;

      return {
        percentage: 100,
        correctCharacters: target.length,
        matchedWords: totalWords,
        totalWords
      };
    }

    const spokenWords = spoken.split(" ");
    const targetWords = target.split(" ");

    let matchedWords = 0;

    /*
     * Compare each target word against the words
     * Chrome recognized.
     *
     * A word is considered matched if it is very
     * similar to one of the recognized words.
     */

    targetWords.forEach((targetWord) => {
      let bestWordMatch = 0;

      spokenWords.forEach((spokenWord) => {
        const maxLength = Math.max(
            targetWord.length,
            spokenWord.length
        );

        if (maxLength === 0) {
          return;
        }

        let matchingCharacters = 0;

        for (
            let i = 0;
            i < Math.min(
                targetWord.length,
                spokenWord.length
            );
            i++
        ) {
          if (targetWord[i] === spokenWord[i]) {
            matchingCharacters++;
          }
        }

        const wordPercentage =
            matchingCharacters / maxLength;

        if (wordPercentage > bestWordMatch) {
          bestWordMatch = wordPercentage;
        }
      });

      /*
       * 70% similarity for an individual word
       * counts that word as successfully recognized.
       */

      if (bestWordMatch >= 0.7) {
        matchedWords++;
      }
    });

    const percentage = Math.round(
        (matchedWords / targetWords.length) * 100
    );

    return {
      percentage,
      correctCharacters: matchedWords,
      matchedWords,
      totalWords: targetWords.length
    };
  };

  /*
   * ============================================================
   * JUDGE PRONUNCIATION
   * ============================================================
   */

  const judgePronunciation = (spokenText) => {
    const normalizedSpeech = normalizeText(spokenText);

    /*
     * First check the existing accepted answers.
     *
     * This preserves your current recognition system.
     */

    const normalizedAnswers = word.accepted.map(
        (answer) => normalizeText(answer)
    );

    /*
     * EXACT MATCH
     *
     * If Chrome recognized one of the accepted answers,
     * give the player 100%.
     */

    const exactMatch = normalizedAnswers.some(
        (answer) => answer === normalizedSpeech
    );

    if (exactMatch) {
      return {
        level: "great",
        title: "Great!",
        message: "Excellent pronunciation!",
        icon: "🟢",
        score: 100,
        points: 200
      };
    }

    /*
     * ============================================================
     * PARTIAL MATCH
     * ============================================================
     *
     * We compare the player's speech against the closest
     * accepted answer.
     */

    let bestMatch = {
      percentage: 0,
      correctCharacters: 0,
      matchedWords: 0,
      totalWords: 0
    };

    normalizedAnswers.forEach((answer) => {
      const match = calculateMatchPercentage(
          normalizedSpeech,
          answer
      );

      if (match.percentage > bestMatch.percentage) {
        bestMatch = match;
      }
    });

    console.log("Recognized:", normalizedSpeech);
    console.log("Best match:", bestMatch);

    /*
     * 80%
     *
     * At least 70% of the target words were recognized.
     */

    if (bestMatch.percentage >= 70) {
      return {
        level: "almost",
        title: "Almost there!",
        message: "You're very close!",
        icon: "🟡",
        score: 80,
        points: 100
      };
    }

    /*
     * 40%
     *
     * At least 2 words/parts were recognized.
     */

    if (
        bestMatch.matchedWords >= 2 ||
        bestMatch.correctCharacters >= 2
    ) {
      return {
        level: "can-do-it",
        title: "You can do it!",
        message:
            "Keep practicing. You're getting there!",
        icon: "🟠",
        score: 40,
        points: 50
      };
    }

    return {
      level: "try-again",
      title: "Try Again",
      message:
          "Listen carefully and try the phrase again.",
      icon: "🔴",
      score: 0,
      points: 0
    };

    /*
     * ============================================================
     * 80% RESULT
     * ============================================================
     */

    if (bestMatch.percentage >= 70) {
      return {
        level: "almost",
        title: "Almost there!",
        message: "You're very close!",
        icon: "🟡",
        score: 80,
        points: 100
      };
    }

    /*
     * ============================================================
     * 40% RESULT
     * ============================================================
     *
     * At least 2 characters must match.
     */

    if (bestMatch.correctCharacters >= 2) {
      return {
        level: "can-do-it",
        title: "You can do it!",
        message:
            "Keep practicing. You're getting there!",
        icon: "🟠",
        score: 40,
        points: 50
      };
    }

    /*
     * ============================================================
     * 0% RESULT
     * ============================================================
     */

    return {
      level: "try-again",
      title: "Try Again",
      message:
          "Listen carefully and try the phrase again.",
      icon: "🔴",
      score: 0,
      points: 0
    };
  };

  /*
   * ============================================================
   * START SPEECH RECOGNITION
   * ============================================================
   */

  const startListening = () => {
    setError("");
    setTranscript("");
    setResult(null);

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
          "Speech recognition is not supported in this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang =
        word.recognitionLang || "hi-IN";

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const spokenText =
          event.results[0][0].transcript;

      console.log(
          "Browser recognized:",
          spokenText
      );

      setTranscript(spokenText);

      const pronunciationResult =
          judgePronunciation(spokenText);

      setResult(pronunciationResult);
    };

    recognition.onerror = (event) => {
      console.log(
          "Speech recognition error:",
          event.error
      );

      setError(
          "We could not understand your speech. Please try again."
      );

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  /*
   * ============================================================
   * CONTINUE TO NEXT WORD
   * ============================================================
   *
   * 100% → 200 points
   * 80%  → 100 points
   * 40%  → 50 points
   * 0%   → cannot continue
   * ============================================================
   */

  const continueToNextWord = () => {
    /*
     * Only 100%, 80%, and 40% can continue.
     */

    if (!result || result.score === 0) {
      return;
    }

    /*
     * Add the points earned for this attempt.
     */

    const pointsEarned = result.points;

    const newScore = score + pointsEarned;

    setScore(newScore);

    /*
     * Move to the next word.
     */

    if (currentWord < words.length - 1) {
      setCurrentWord(currentWord + 1);

      setTranscript("");
      setResult(null);
      setError("");
    } else {
      /*
       * The player completed the final level.
       */

      const elapsedSeconds = Math.floor(
          (Date.now() - gameStartTime) / 1000
      );

      setTimePlayedInSeconds(elapsedSeconds);
      setCompleted(true);
      setResult(null);
    }
  };

  /*
   * ============================================================
   * RESTART GAME
   * ============================================================
   */

  const restartChallenge = () => {
    setCurrentWord(0);
    setTranscript("");
    setResult(null);
    setError("");
    setCompleted(false);

    setScore(0);
    setTimePlayedInSeconds(0);
    setGameStartTime(Date.now());
  };

  /*
   * ============================================================
   * FORMAT TIME
   * ============================================================
   */

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;

    return `${minutes}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
  };

  /*
   * ============================================================
   * SUBMIT SCORE
   * ============================================================
   */

  const handleSubmitScore = async () => {
    await submitLeaderboardScore(
        score,
        timePlayedInSeconds
    );
  };

  /*
   * ============================================================
   * COMPLETION SCREEN
   * ============================================================
   */

  if (completed) {
    return (
        <div className="app">
          <div className="game-card">

            <div className="account-bar">
              {user ? (
                  <div className="logged-in-area">
                <span>
                  Signed in as{" "}
                  <strong>
                    {user.displayName || user.email}
                  </strong>
                </span>

                    <button
                        className="text-button"
                        onClick={signOutUser}
                    >
                      Sign Out
                    </button>
                  </div>
              ) : (
                  <button
                      className="login-button"
                      onClick={() => setShowAuth(true)}
                  >
                    Sign In
                  </button>
              )}
            </div>

            <div className="completion-icon">
              🎉
            </div>

            <h1>Challenge Complete!</h1>

            <p className="instruction">
              You completed all 5 Sanskrit pronunciation
              challenges.
            </p>

            <div className="final-stats">

              <div className="stat-box">
                <div className="stat-label">
                  Score
                </div>

                <div className="stat-value">
                  {score} / 1000
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-label">
                  Time
                </div>

                <div className="stat-value">
                  {formatTime(timePlayedInSeconds)}
                </div>
              </div>

            </div>

            <div className="leaderboard-section">

              <h2>Leaderboard</h2>

              {!user && (
                  <p className="leaderboard-info">
                    Sign in to submit your score to the
                    ZATM leaderboard.
                  </p>
              )}

              {user && (
                  <button
                      className="submit-score-button"
                      onClick={handleSubmitScore}
                      disabled={submittingScore}
                  >
                    {submittingScore
                        ? "Submitting..."
                        : "🏆 Submit Score"}
                  </button>
              )}

              {leaderboardMessage && (
                  <p className="leaderboard-message">
                    {leaderboardMessage}
                  </p>
              )}

            </div>

            <button
                className="speak-button"
                onClick={restartChallenge}
            >
              🔄 Start Again
            </button>

          </div>

          {showAuth && (
              <AuthPanel
                  onClose={() => setShowAuth(false)}
              />
          )}
        </div>
    );
  }

  /*
   * ============================================================
   * MAIN GAME SCREEN
   * ============================================================
   */

  return (
      <div className="app">

        <div className="game-card">

          <div className="account-bar">

            {user ? (
                <div className="logged-in-area">
              <span>
                👤{" "}
                {user.displayName || user.email}
              </span>

                  <button
                      className="text-button"
                      onClick={signOutUser}
                  >
                    Sign Out
                  </button>
                </div>
            ) : (
                <button
                    className="login-button"
                    onClick={() => setShowAuth(true)}
                >
                  Sign In
                </button>
            )}

          </div>

          <div className="game-info">

            <div className="progress">
              {currentWord + 1} / {words.length}
            </div>

            <div className="current-score">
              Score: {score} / 1000
            </div>

          </div>

          <h1>
            Pronunciation Challenge
          </h1>

          <p className="instruction">
            Listen to the Sanskrit phrase, then say it.
          </p>

          <div className="sanskrit-word">
            {word.sanskrit}
          </div>

          <p className="meaning">
            {word.meaning}
          </p>

          <button
              className="listen-button"
              onClick={playAudio}
          >
            🔊 Listen
          </button>

          <button
              className="speak-button"
              onClick={startListening}
              disabled={isListening}
          >
            🎤{" "}
            {isListening
                ? "Listening..."
                : "Start Speaking"}
          </button>

          <div className="result">

            <h2>Your attempt</h2>

            {transcript ? (
                <p className="transcript">
                  {transcript}
                </p>
            ) : (
                <p className="placeholder">
                  Your speech will appear here.
                </p>
            )}

          </div>

          {error && (
              <p className="error">
                {error}
              </p>
          )}

        </div>

        {/*
        * ========================================================
        * RESULT POPUP
        * ========================================================
        */}

        {result && (
            <div className="popup-overlay">

              <div
                  className={`popup ${result.level}`}
              >

                <div className="popup-icon">
                  {result.icon}
                </div>

                <h2>
                  {result.title}
                </h2>

                <p>
                  {result.message}
                </p>

                <div className="score">
                  {result.score}%
                </div>

                <p className="spoken-result">
                  You said:
                </p>

                <div className="popup-word">
                  {transcript}
                </div>

                {/*
                * 100%, 80%, and 40%
                * all get Continue.
                */}

                {result.score > 0 && (
                    <button
                        className="close-button"
                        onClick={continueToNextWord}
                    >
                      Continue
                    </button>
                )}

                {/*
                * Only 0% gets Try Again.
                */}

                {result.score === 0 && (
                    <button
                        className="close-button"
                        onClick={() => setResult(null)}
                    >
                      Try Again
                    </button>
                )}

              </div>

            </div>
        )}

        {showAuth && (
            <AuthPanel
                onClose={() => setShowAuth(false)}
            />
        )}

      </div>
  );
}

export default App;