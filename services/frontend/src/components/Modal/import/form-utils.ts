import * as yup from "yup";

export interface IImportForm {
  url: string;
  visibility: string[];
}

export interface IImportFinalValues {
  url: string;
  visibility: number;
}

const initialValues: IImportForm = {
  url: "",
  visibility: []
};

export const validationSchema = yup.object({
  url: yup
    .string()
    .max(256, "url should be 500 characters or less")
    .required("url is required")
});

export const getInitialValues = (values?: any): IImportForm => {
  if (!values) {
    return {
      ...initialValues
    };
  }

  const { url, visibility } = values;

  return {
    url: url ?? (initialValues.url as string),
    visibility: visibility ?? []
  };
};

export const getFinalValues = (values: IImportForm): IImportFinalValues => {
  const { url, visibility } = values;

  return {
    url: url ?? "",
    visibility: visibility.length ? 1 : 0
  };
};
