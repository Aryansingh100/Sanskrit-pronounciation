import { useState } from "react";
import "./App.css";

function App() {
  const [currentWord, setCurrentWord] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [completed, setCompleted] = useState(false);

  // --------------------------------
  // WORDS
  // --------------------------------

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
        "चिन्ता मास्तु",
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
        "bhavatah nama kim",
        "bhavataha nama kim",
        "bhavato nama kim"
      ]
    }

  ];

  const word = words[currentWord];

  // --------------------------------
  // NORMALIZE TEXT
  // --------------------------------

  const normalizeText = (text) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[।.,!?]/g, "")
      .replace(/\s+/g, " ");
  };

  // --------------------------------
  // PLAY MP3 AUDIO
  // --------------------------------

  const playAudio = () => {
    setError("");

    try {
      const audio = new Audio(word.audio);

      audio.play().catch(() => {
        setError(
          "The audio could not be played. Please check that the MP3 file exists."
        );
      });
    } catch (error) {
      setError("There was a problem playing the audio.");
    }
  };

  // --------------------------------
  // CHECK PRONUNCIATION
  // --------------------------------

  const judgePronunciation = (spokenText) => {
    const normalizedSpeech = normalizeText(spokenText);

    const isCorrect = word.accepted.some(
      (answer) =>
        normalizeText(answer) === normalizedSpeech
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
      message:
        "Listen carefully and try the phrase again.",
      icon: "🔴",
      score: 0
    };
  };

  // --------------------------------
  // SPEECH RECOGNITION
  // --------------------------------

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

    // Hindi recognition currently works better
    // for Sanskrit pronunciation in your setup.
    recognition.lang = word.recognitionLang || "hi-IN";

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

  // --------------------------------
  // CONTINUE TO NEXT WORD
  // --------------------------------

  const continueToNextWord = () => {
    // Only continue if the user got 100%
    if (!result || result.score !== 100) {
      return;
    }

    if (currentWord < words.length - 1) {
      setCurrentWord(currentWord + 1);

      setTranscript("");
      setResult(null);
      setError("");
    } else {
      setCompleted(true);
      setResult(null);
    }
  };

  // --------------------------------
  // RESTART CHALLENGE
  // --------------------------------

  const restartChallenge = () => {
    setCurrentWord(0);
    setTranscript("");
    setResult(null);
    setError("");
    setCompleted(false);
  };

  // --------------------------------
  // COMPLETED SCREEN
  // --------------------------------

  if (completed) {
    return (
      <div className="app">
        <div className="game-card">

          <div className="completion-icon">
            🎉
          </div>

          <h1>
            Challenge Complete!
          </h1>

          <p className="instruction">
            You completed all 5
            Sanskrit pronunciation
            challenges.
          </p>

          <button
            className="speak-button"
            onClick={restartChallenge}
          >
            🔄 Start Again
          </button>

        </div>
      </div>
    );
  }

  // --------------------------------
  // MAIN SCREEN
  // --------------------------------

  return (
    <div className="app">

      <div className="game-card">

        {/* PROGRESS */}

        <div className="progress">
          {currentWord + 1} / {words.length}
        </div>

        <h1>
          Pronunciation Challenge
        </h1>

        <p className="instruction">
          Listen to the Sanskrit phrase,
          then say it.
        </p>

        {/* WORD */}

        <div className="sanskrit-word">
          {word.sanskrit}
        </div>

        {/* MEANING */}

        <p className="meaning">
          {word.meaning}
        </p>

        {/* LISTEN */}

        <button
          className="listen-button"
          onClick={playAudio}
        >
          🔊 Listen
        </button>

        {/* SPEAK */}

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

        {/* TRANSCRIPT */}

        <div className="result">

          <h2>
            Your attempt
          </h2>

          {transcript ? (
            <p className="transcript">
              {transcript}
            </p>
          ) : (
            <p className="placeholder">
              Your speech will
              appear here.
            </p>
          )}

        </div>

        {/* ERROR */}

        {error && (
          <p className="error">
            {error}
          </p>
        )}

      </div>

      {/* RESULT POPUP */}

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

            {/* CONTINUE ONLY AFTER 100% */}

            {result.score === 100 && (
              <button
                className="close-button"
                onClick={continueToNextWord}
              >
                Continue
              </button>
            )}

            {/* TRY AGAIN */}

            {result.score !== 100 && (
              <button
                className="close-button"
                onClick={() =>
                  setResult(null)
                }
              >
                Try Again
              </button>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default App;