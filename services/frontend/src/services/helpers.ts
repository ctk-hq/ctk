export const checkHttpStatus = (response: any) => {
  if ([200, 201, 202].includes(response.status)) {
    return response.json();
  }

  if (response.status === 204) {
    return response;
  }

  throw response;
}

export const checkHttpSuccess = (response: any) => {
  if ([200, 201, 202].includes(response.status)) {
    return response.json();
  }

  if (response.status === 204) {
    return response;
  }

  throw response;
}
