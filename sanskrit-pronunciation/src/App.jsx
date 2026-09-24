import { useEffect, useState } from "react";
import "./App.css";

import { useAuth } from "./hooks/useAuth";
import { useLeaderboard } from "./hooks/useLeaderboard";
import AuthPanel from "./components/auth/AuthPanel";

const initialWords = [
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
      "चिंता वास्तु",
      "चिंता मास्टर",
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
      "भगत नाम किम",
      "बहुत नाम के",
      "भगत नाम की",
      "बहुत नमकम",
      "भगत नाम के",
      "bhavatah nama kim",
      "bhavataha nama kim",
      "bhavato nama kim"
    ]
  }
];

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

function App() {
  const { user, signOutUser } = useAuth();

  const [words, setWords] = useState(initialWords);

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
    const loadIASTReferences = async () => {
      try {
        const updatedWords = await Promise.all(
            initialWords.map(async (word) => {
              try {
                const iast = await generateIAST(word.sanskrit);

                console.log(
                    `${word.sanskrit} → ${iast}`
                );

                return {
                  ...word,
                  iast
                };
              } catch (error) {
                console.error(
                    `Could not generate IAST for ${word.sanskrit}`,
                    error
                );

                return word;
              }
            })
        );

        setWords(updatedWords);
      } catch (error) {
        console.error(
            "Could not generate IAST references:",
            error
        );
      }
    };

    loadIASTReferences();
  }, []);

  const {
    leaderboardMessage,
    submittingScore,
    submitLeaderboardScore
  } = useLeaderboard(user);

  const word = words[currentWord];

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
    } catch (error) {
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

    const isCorrect = normalizedAnswers.some(
        (answer) => answer === normalizedSpeech
    );

    if (isCorrect) {
      return {
        level: "great",
        title: "Great!",
        message: "Excellent pronunciation!",
        icon: "🟢",
        score: 100
      };
    }

    return {
      level: "try-again",
      title: "Try Again",
      message: "Listen carefully and try the phrase again.",
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

  const continueToNextWord = () => {
    if (!result || result.score !== 100) {
      return;
    }

    // Each completed level is worth 200 points.
    const pointsEarned = 200;
    const newScore = score + pointsEarned;

    setScore(newScore);

    if (currentWord < words.length - 1) {
      setCurrentWord(currentWord + 1);
      setTranscript("");
      setResult(null);
      setError("");
    } else {
      // Final level completed
      const elapsedSeconds = Math.floor(
          (Date.now() - gameStartTime) / 1000
      );

      setTimePlayedInSeconds(elapsedSeconds);
      setCompleted(true);
      setResult(null);
    }
  };

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
                      Continue
                    </button>
                )}

                {result.score !== 100 && (
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