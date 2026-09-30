import { doc, getDoc } from "firebase/firestore";
import { wordBankConfig, wordBankDb } from "../wordbank-config";

export async function getWordBankWords(documentId) {
  if (!documentId) {
    throw new Error("A word bank document ID is required.");
  }

  const wordBankRef = doc(
      wordBankDb,
      wordBankConfig.collection,
      documentId
  );
  const wordBankSnapshot = await getDoc(wordBankRef);

  if (!wordBankSnapshot.exists()) {
    throw new Error(
        `Word bank document "${documentId}" was not found.`
    );
  }

  const words = wordBankSnapshot.data()[wordBankConfig.field];
  const validWords = Array.isArray(words) &&
      words.length > 0 &&
      words.every((word) =>
        word.sanskrit &&
        word.meaning &&
        word.audio &&
        Array.isArray(word.accepted)
      );

  if (!validWords) {
    throw new Error("Word data has an invalid format.");
  }

  return words.map((word, index) => ({
    ...word,
    id: word.id ?? `${documentId}_${index}`
  }));
}
