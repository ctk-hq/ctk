import { createAction, props } from '@ngrx/store'

export const PROJECT_NOT_FOUND = '[GLOBAL_ERROR] Project not found'
export const SERVER_ERROR = '[GLOBAL_SPINNER] Server error'

export const ProjectNotFound = createAction(PROJECT_NOT_FOUND, props<{ message: string, _type: string }>())
export const ServerError = createAction(SERVER_ERROR, props<{ message: string, _type: string }>())