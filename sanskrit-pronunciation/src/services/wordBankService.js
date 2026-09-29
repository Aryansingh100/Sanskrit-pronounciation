import { doc, getDoc } from "firebase/firestore";
import { wordBankConfig, wordBankDb } from "../wordbank-config";

export async function getWordBankWords() {
  const wordBankRef = doc(
      wordBankDb,
      wordBankConfig.collection,
      wordBankConfig.documentId
  );
  const wordBankSnapshot = await getDoc(wordBankRef);

  if (!wordBankSnapshot.exists()) {
    throw new Error(
        `Word bank document "${wordBankConfig.documentId}" was not found.`
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

  return words;
}