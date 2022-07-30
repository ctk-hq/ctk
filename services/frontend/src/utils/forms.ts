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

export const pruneObject = <T, R = T>(object: T): R | undefined => {
  const result = lodash.pickBy(object ?? {}, (value) => value !== undefined);
  if (Object.keys(result).length === 0) {
    return undefined;
  }
  return result as unknown as R;
};

export const pruneString = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  return value;
};

export const splitKVPairs = (
  text: string,
  seperator: string,
  optional = true
): [string, string] => {
  const firstIndex = text.indexOf(seperator);
  if (firstIndex < 0) {
    if (optional) {
      return [text, ""];
    } else {
      throw new Error("Malformed document!");
    }
  }
  const key = text.substring(0, firstIndex);
  const value = text.substring(firstIndex + 1);
  return [key, value];
};

export type TTransformFunction = (
  item: string,
  index: number
) => Record<string, any>;

export const loadObjectOrArrayAsObject = (
  transform: TTransformFunction,
  object?: any
): any => {
  if (!object) {
    return undefined;
  }

  if (Array.isArray(object)) {
    return object.map(transform);
  }

  return object;
};

export const loadArrayAsObject = (
  transform: TTransformFunction,
  array?: string[]
) => {
  if (!array) {
    return undefined;
  }

  if (!Array.isArray(array)) {
    throw new Error("Malformed document. Expected an array at this point.");
  }

  return array.map(transform);
};

export const extractObjectOrArray = (
  seperator: string,
  keyName: string,
  valueName: string,
  object: any
): any =>
  loadObjectOrArrayAsObject((item: string) => {
    const [key, value] = splitKVPairs(item, seperator);
    return {
      [keyName]: key,
      [valueName]: value
    };
  }, object);

export const extractArray = (
  seperator: string,
  keyName: string,
  valueName: string,
  object: any
): any =>
  loadArrayAsObject((item: string) => {
    const [key, value] = splitKVPairs(item, seperator);
    return {
      [keyName]: key,
      [valueName]: value
    };
  }, object);
