import { useEffect, useState } from "react";
import "./App.css";

import { useAuth } from "./hooks/useAuth";
import { useLeaderboard } from "./hooks/useLeaderboard";
import AuthPanel from "./components/auth/AuthPanel";

const shuffleWords = (words) => {
  const shuffled = [...words];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i]
    ];
  }

  return shuffled;
};

const generateIAST = async (sanskritText) => {
  const params = new URLSearchParams({
    source: "Devanagari",
    target: "IAST",
    text: sanskritText
  });

  const response = await fetch(
      `https://aksharamukha-plugin.appspot.com/api/public?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Aksharamukha request failed.");
  }

  const result = await response.text();

  return result.trim();
};

const calculateEditDistance = (a, b) => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const calculateSimilarity = (a, b) => {
  if (!a && !b) {
    return 1;
  }

  if (!a || !b) {
    return 0;
  }

  const distance = calculateEditDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  return 1 - distance / maxLength;
};

const calculateWordCoverage = (target, spoken) => {
  const targetWords = target
      .split(" ")
      .filter(Boolean);

  const spokenWords = spoken
      .split(" ")
      .filter(Boolean);

  if (targetWords.length === 0) {
    return 0;
  }

  let matchedWords = 0;

  targetWords.forEach((targetWord) => {
    const bestWordSimilarity = Math.max(
        ...spokenWords.map((spokenWord) =>
            calculateSimilarity(targetWord, spokenWord)
        ),
        0
    );

    if (bestWordSimilarity >= 0.65) {
      matchedWords++;
    }
  });

  return matchedWords / targetWords.length;
};

function App() {
  const { user, signOutUser } = useAuth();

  const [words, setWords] = useState([]);
  const [isLoadingWords, setIsLoadingWords] = useState(true);
  const [dataError, setDataError] = useState("");

  const [currentWord, setCurrentWord] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [completed, setCompleted] = useState(false);

  // Leaderboard and game score
  const [score, setScore] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(() => Date.now());
  const [timePlayedInSeconds, setTimePlayedInSeconds] = useState(0);

  // Authentication popup
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadWords = async () => {
      try {
        const response = await fetch("/data/words.json");

        if (!response.ok) {
          throw new Error("Could not load word data.");
        }

        const data = await response.json();
        const validWords = Array.isArray(data.words) &&
            data.words.length > 0 &&
            data.words.every((word) =>
              word.sanskrit &&
              word.meaning &&
              word.audio &&
              Array.isArray(word.accepted)
            );

        if (!validWords) {
          throw new Error("Word data has an invalid format.");
        }

        const shuffledWords = shuffleWords(data.words);
        setWords(shuffledWords);
        setIsLoadingWords(false);

        Promise.all(
            shuffledWords.map(async (word) => {
              try {
                return {
                  ...word,
                  iast: await generateIAST(word.sanskrit)
                };
              } catch (error) {
                console.error(
                    `Could not generate IAST for ${word.sanskrit}`,
                    error
                );
                return word;
              }
            })
        ).then((updatedWords) => {
          if (!cancelled) {
            setWords(updatedWords);
          }
        });
      } catch (error) {
        console.error("Could not load words:", error);
        if (!cancelled) {
          setDataError(error.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWords(false);
        }
      }
    };

    loadWords();

    return () => {
      cancelled = true;
    };
  }, []);

  const {
    leaderboardMessage,
    submittingScore,
    submitLeaderboardScore
  } = useLeaderboard(user);

  const word = words[currentWord];
  const maxScore = words.length * 200;

  const normalizeText = (text) => {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[।.,!?]/g, "")
        .replace(/\s+/g, " ");
  };

  const playAudio = () => {
    setError("");

    try {
      const audio = new Audio(word.audio);

      audio.play().catch(() => {
        setError("The audio could not be played.");
      });
    } catch {
      setError("There was a problem playing the audio.");
    }
  };

  const judgePronunciation = (spokenText) => {
    const normalizedSpeech = normalizeText(spokenText);

    const acceptedAnswers = [
      ...word.accepted,
      word.iast
    ].filter(Boolean);

    const normalizedAnswers = acceptedAnswers.map(
        (answer) => normalizeText(answer)
    );

    console.log("Recognized:", normalizedSpeech);
    console.log("Accepted:", normalizedAnswers);
    console.log("IAST:", word.iast);

    // 1. GREAT

    const exactMatch = normalizedAnswers.some(
        (answer) => answer === normalizedSpeech
    );

    if (exactMatch) {
      return {
        level: "great",
        title: "Great!",
        message: "Excellent pronunciation!",
        icon: "🟢",
        score: 100
      };
    }

    // 2. FIND BEST SIMILARITY

    let bestSimilarity = 0;
    let bestWordCoverage = 0;

    normalizedAnswers.forEach((answer) => {
      const similarity = calculateSimilarity(
          answer,
          normalizedSpeech
      );

      const wordCoverage = calculateWordCoverage(
          answer,
          normalizedSpeech
      );

      bestSimilarity = Math.max(
          bestSimilarity,
          similarity
      );

      bestWordCoverage = Math.max(
          bestWordCoverage,
          wordCoverage
      );
    });

    console.log(
        "Best similarity:",
        bestSimilarity
    );

    console.log(
        "Best word coverage:",
        bestWordCoverage
    );

    // 3. ALMOST THERE

    if (
        bestSimilarity >= 0.50 ||
        bestWordCoverage >= 0.50
    ) {
      return {
        level: "almost",
        title: "Almost There!",
        message:
            "You were close! Listen again and try to pronounce the full phrase.",
        icon: "🟡",
        score: 80
      };
    }
    // 4. TRY AGAIN

    return {
      level: "try-again",
      title: "Try Again",
      message:
          "The recognized speech was quite different from the target.",
      icon: "🔴",
      score: 0
    };
  };

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

    recognition.lang = word.recognitionLang || "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;

      console.log("Browser recognized:", spokenText);

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

  const tryAgain = () => {
    if (!result) {
      return;
    }

    if (result.score === 0) {
      // -50 points for incorrect answer
      setScore((currentScore) =>
          Math.max(0, currentScore - 50)
      );
    }

    setResult(null);
    setTranscript("");
  };

  const continueToNextWord = () => {
    if (!result) {
      return;
    }

    const pointsEarned = result.score === 100
        ? 200
        : result.score === 80
          ? 100
          : 0;

    if (pointsEarned === 0) {
      return;
    }

    const newScore = score + pointsEarned;

    setScore(newScore);

    if (currentWord < words.length - 1) {
      setCurrentWord(currentWord + 1);
      setTranscript("");
      setResult(null);
      setError("");
    } else {
      const elapsedSeconds = Math.floor(
          (Date.now() - gameStartTime) / 1000
      );

      setTimePlayedInSeconds(elapsedSeconds);
      setCompleted(true);
      setResult(null);
    }
  };

  const restartChallenge = () => {
    setWords((currentWords) =>
        shuffleWords(currentWords)
    );

    setCurrentWord(0);
    setTranscript("");
    setResult(null);
    setError("");
    setCompleted(false);

    setScore(0);
    setTimePlayedInSeconds(0);
    setGameStartTime(Date.now());
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
  };

  const handleSubmitScore = async () => {
    await submitLeaderboardScore(
        score,
        timePlayedInSeconds
    );
  };

  if (isLoadingWords) {
    return (
        <div className="app">
          <div className="game-card">
            <p className="instruction">Loading words...</p>
          </div>
        </div>
    );
  }

  if (dataError) {
    return (
        <div className="app">
          <div className="game-card">
            <p className="error">{dataError}</p>
          </div>
        </div>
    );
  }

  /*
   * COMPLETION SCREEN
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
              You completed all {words.length} Sanskrit pronunciation
              challenges.
            </p>

            <div className="final-stats">

              <div className="stat-box">
                <div className="stat-label">
                  Score
                </div>

                <div className="stat-value">
                  {score} / {maxScore}
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
   * MAIN GAME SCREEN
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
              Score: {score} / {maxScore}
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

                {result.score === 100 && (
                    <button
                        className="close-button"
                        onClick={continueToNextWord}
                    >
                      Continue (+200)
                    </button>
                )}

                {result.score === 80 && (
                    <>
                      <button
                          className="close-button"
                          onClick={continueToNextWord}
                      >
                        Continue (+100)
                      </button>

                      <button
                          className="close-button"
                          onClick={() => setResult(null)}
                      >
                        Try Again
                      </button>
                    </>
                )}

                {result.score === 0 && (
                    <button
                        className="close-button"
                        onClick={tryAgain}
                    >
                      Try Again (-50)
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