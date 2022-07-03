const AUTH_LOGIN_SUCCESS = "auth-login-success";
const AUTH_LOGOUT_SUCCESS = "auth-logout-success";
const AUTH_SELF = "auth-self"

export const initialState = {
  user: {}
}

export const reducer = (state: any, action: any) => {

  switch (action.type) {
    case AUTH_LOGIN_SUCCESS:
      return {
        ...state,
        user: { ...action.payload.user }
      }
    case AUTH_SELF:
      return {
        ...state,
        user: { ...action.payload }
      }
    case AUTH_LOGOUT_SUCCESS:
      return {
        ...state,
        user: null
      }
    default:
      throw new Error()
  }
}

export const authLoginSuccess = (data: any) => ({
  type: AUTH_LOGIN_SUCCESS,
  payload: data
});

export const authLogoutSuccess = () => ({
  type: AUTH_LOGOUT_SUCCESS,
});

export const authSelf = (data: any) => ({
  type: AUTH_SELF,
  payload: data
});
