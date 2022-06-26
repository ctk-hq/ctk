import { omit } from "lodash";

const RESET = "reset";

const PROJECT_NAME = "project-name";
const CANVAS_POSITION = "canvas-position";

const ENDPOINT_ALL = "endpoints";
const ENDPOINT_CREATED = "endpoint-created";
const ENDPOINT_UPDATED = "endpoint-updated";
const ENDPOINT_DELETED = "endpoint-deleted";

const CONNECTIONS_ALL = "connections";
const CONNECTION_DETACHED = "connection-detached";
const CONNECTION_ATTACHED = "connection-attached";

const AUTH_LOGIN_SUCCESS = "auth-login-success";
const AUTH_LOGOUT_SUCCESS = "auth-logout-success";
const AUTH_SELF = "auth-self"

const getMatchingSetIndex = (setOfSets: [[string, string]], findSet: [string, string]): number => {
  return setOfSets.findIndex((set) => set.toString() === findSet.toString());
}

export const initialState = {
  projectName: "",
  nodes: {},
  connections: [],
  canvasPosition: {
    top: 0,
    left: 0,
    scale: 1
  }
}

export const reducer = (state: any, action: any) => {
  let existingIndex;
  let _connections;

  switch (action.type) {
    case RESET:
      return {
        ...initialState
      }
    
    case PROJECT_NAME:
      return {
        ...state,
        projectName: action.payload
      }
    case CANVAS_POSITION:
      return {
        ...state,
        canvasPosition: {...state.canvasPosition, ...action.payload}
      }
    case ENDPOINT_ALL:
      return {
        ...state,
        nodes: action.payload
      }
    case ENDPOINT_CREATED:
      return {
        ...state,
        nodes: {...state.nodes, [action.payload.key]: action.payload}
      }
    case ENDPOINT_DELETED:
      return {
        ...state,
        nodes: {...omit(state.nodes, action.payload.key)}
      }
    case ENDPOINT_UPDATED:
      return {
        ...state,
        nodes: {...state.nodes, [action.payload.key]: action.payload}
      }
    case CONNECTIONS_ALL:
      return {
        ...state,
        connections: action.payload.map((x: any) => x)
      }
    case CONNECTION_DETACHED:
      _connections = state.connections;
      existingIndex = getMatchingSetIndex(_connections, action.payload);

      if (existingIndex !== -1) {
        _connections.splice(existingIndex, 1);
      }

      return {
        ...state,
        connections: [..._connections]
      }
    case CONNECTION_ATTACHED:
      _connections = state.connections;
      existingIndex = getMatchingSetIndex(state.connections, action.payload);

      if (existingIndex === -1) {
        _connections.push(action.payload);
      }

      return {
        ...state,
        connections: [..._connections]
      }
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

export const updateProjectName = (data: string) => ({
  type: PROJECT_NAME,
  payload: data
});

export const position = (data: any) => ({
  type: CANVAS_POSITION,
  payload: data
});

export const connections = (data: any) => ({
  type: CONNECTIONS_ALL,
  payload: data || []
});

export const connectionDetached = (data: any) => ({
  type: CONNECTION_DETACHED,
  payload: data
});

export const connectionAttached = (data: any) => ({
  type: CONNECTION_ATTACHED,
  payload: data
});

export const nodes = (data: any) => ({
  type: ENDPOINT_ALL,
  payload: data || {}
});

export const nodeCreated = (data: any) => ({
  type: ENDPOINT_CREATED,
  payload: data
});

export const nodeUpdated = (data: any) => ({
  type: ENDPOINT_UPDATED,
  payload: data
});

export const nodeDeleted = (data: any) => ({
  type: ENDPOINT_DELETED,
  payload: data
});

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

export const resetState = () => ({
  type: RESET
})