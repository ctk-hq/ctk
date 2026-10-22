import lodash from "lodash";
import { toaster } from ".";

export const checkArray = <T,>(array: any, name: string): T => {
  if (!Array.isArray(array)) {
    throw new Error(
      `Looks like we encountered a bug. The current implementation expects "${name}" to be an array.`
    );
  }
  return array as unknown as T;
};

export const pruneArray = <T,>(array: (T | undefined)[]): T[] | undefined => {
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

export const pruneNumber = (value?: number): number | undefined => {
  if (
    value === undefined ||
    value === null ||
    isNaN(value) ||
    (value as unknown as string) === ""
  ) {
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

export const extractObjectOrArray = (
  seperator: string,
  keyName: string,
  valueName: string,
  object: any
): any => {
  if (!object) {
    return undefined;
  }

  if (Array.isArray(object)) {
    return object.map((item: string) => {
      const [key, value] = splitKVPairs(item, seperator);
      return {
        [keyName]: key,
        [valueName]: value
      };
    });
  }

  return Object.entries(object).map(([key, value]) => {
    return {
      [keyName]: key,
      [valueName]: value
    };
  });
};

export const extractArray = (
  seperator: string,
  keyName: string,
  valueName: string,
  array: any
): any => {
  if (!array) {
    return undefined;
  }

  if (!Array.isArray(array)) {
    throw new Error("Malformed document. Expected an array at this point.");
  }

  return array.map((item: string) => {
    const [key, value] = splitKVPairs(item, seperator);
    return {
      [keyName]: key,
      [valueName]: value
    };
  });
};

/**
 * Converts an array of the form `[{ [K]: string, [V]: string}]` to `{K: V}`.
 * For example,
 * ```
 * [
 *     {
 *         key: "NODE_ENV",
 *         value: "production"
 *     }
 * ]
 *
 * becomes
 *
 * {
 *     NODE_ENV: "production"
 * }
 * ```
 */
export const packArrayAsObject = (
  array: any[],
  keyName: string,
  valueName: string
) => {
  return pruneObject(
    Object.fromEntries(array.map((item) => [item[keyName], item[valueName]]))
  );
};

/**
 * Converts an array objects of the form
 * ```
 * [
 *      {
 *          [K]: string,
 *          [V]: string
 *      }
 *      ...
 *  ]`
 *
 * to
 *
 * [
 *     `${item[i][K]]}${seperator}${item[i][V]}`,
 *      ...
 * ]
 * ```
 *
 * For example,
 * ```
 * [
 *     {
 *         key: "NODE_ENV",
 *         value: "production"
 *     }
 * ]
 *
 * becomes
 *
 * {
 *     "NODE_ENV=production"
 * }
 * ```
 */
export const packArrayAsStrings = (
  objects: any[],
  keyName: string,
  valueName: string,
  seperator: string
) => {
  return pruneArray(
    objects.map((object) =>
      [object[keyName], object[valueName]].join(seperator)
    )
  );
};

const isObject = (value: any) => {
  return !!(value && typeof value === "object" && !Array.isArray(value));
};

const renderToast = (path: string, message: string) => (
  <p>
    <span className="text-xs font-semibold">{path}</span>
    <br />
    {message}
  </p>
);

const reportError = (prefix: string, error: any[] | string) => {
  if (lodash.isString(error) && /\s/.test(error)) {
    toaster(renderToast(prefix, error as string), "error");
    return;
  }

  if (Array.isArray(error)) {
    error.forEach((item, index) => {
      reportError(`${prefix} > ${index}`, item);
    });
  }

  if (isObject(error)) {
    const normalizedPrefix = `${prefix}${prefix !== "" ? " > " : ""}`;
    for (const [key, value] of Object.entries(error)) {
      if (Array.isArray(value) || isObject(value)) {
        reportError(`${normalizedPrefix}${key}`, value);
      } else if (lodash.isString(value)) {
        toaster(renderToast(normalizedPrefix + key, value as string), "error");
      } else {
        throw new Error("Unknown path");
      }
    }
  }
};

/** Report current errors across tabs, then let Formik mark fields and submit. */
export const reportErrorsAndSubmit = (formik: any) => async () => {
  const errors = await formik.validateForm();
  if (Object.keys(errors).length > 0) reportError("", errors);
  await formik.submitForm();
};
