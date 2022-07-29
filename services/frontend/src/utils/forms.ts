import lodash from "lodash";

export const checkArray = <T>(array: any, name: string): T => {
  if (!Array.isArray(array)) {
    throw new Error(
      `Looks like we encountered a bug. The current implementation expects "${name}" to be an array.`
    );
  }
  return array as unknown as T;
};

export const pruneArray = <T>(array: (T | undefined)[]): T[] | undefined => {
  const result = array.filter(Boolean);
  if (array.length === 0) {
    return undefined;
  }
  return result as T[];
};

export const pruneObject = <T>(object: T): unknown | undefined => {
  const result = lodash.pickBy(object ?? {}, (value) => value !== undefined);
  if (Object.keys(result).length === 0) {
    return undefined;
  }
  return result as unknown;
};
