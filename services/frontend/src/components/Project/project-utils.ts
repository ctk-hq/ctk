import randomWords from "random-words";

export const defaultProjectName = (): string =>
  randomWords({
    wordsPerString: 2,
    exactly: 1,
    separator: "-"
  } as any)[0];
