export const checkHttpStatus = (response: any) => {
  if ([200, 201, 202].includes(response.status)) {
    return response.json();
  }

  if (response.status === 204) {
    return response;
  }

  throw response;
};

export const authErrorMessage = async (error: unknown): Promise<string> => {
  if (error instanceof Response) {
    try {
      const payload = await error.json();
      return (
        Object.values(payload).flat().map(String).join(" ") ||
        "Unable to sign in. Please try again."
      );
    } catch {
      return "Unable to sign in. Please try again.";
    }
  }
  return "Unable to connect. Please try again.";
};

export const checkHttpSuccess = (response: any) => {
  if ([200, 201, 202].includes(response.status)) {
    return response.json();
  }

  if (response.status === 204) {
    return response;
  }

  throw response;
};
