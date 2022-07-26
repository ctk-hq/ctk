export const checkArray = <T>(array: any, name: string): T => {
  if (!Array.isArray(array)) {
    throw new Error(
      `Looks like we encountered a bug. The current implementation expects "${name}" to be an array.`
    );
  }
  return array as unknown as T;
};
