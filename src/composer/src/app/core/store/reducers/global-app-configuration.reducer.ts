import { createReducer, on } from '@ngrx/store'
import * as GlobalConfigurationActions from '../actions/global-app-configuration.actions'

export const initialState = {
    mode: 'compose'
}

export const globalConfigurationReducer = createReducer(
    initialState,
    on(GlobalConfigurationActions.OnComposeMode, (state) => ({ ...state, mode: 'compose'})),
    on(GlobalConfigurationActions.OnImportMode, (state) => ({ ...state, mode: 'import'})),
    on(GlobalConfigurationActions.OnRecipeLoadMode, (state) => ({ ...state, mode: 'recipe_load'}))
)