import { createReducer, on } from '@ngrx/store'
import * as GlobalDialogActions from '../actions/global-dialog.actions'

export const initialState = {
    message: '',
    type: ''
}

export const globalDialogReducer = createReducer(
    initialState,
    on(GlobalDialogActions.ProjectNotFound, (state, newState) => ({ ...state, ...newState})),
    on(GlobalDialogActions.ServerError, (state, newState) => ({ ...state, ...newState}))
)