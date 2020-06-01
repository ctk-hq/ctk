import { createReducer, on } from '@ngrx/store'
import * as GlobalSpinnerActions from '../actions/global-spinner.actions'

export const initialState: boolean = false

export const globalSpinnerReducer = createReducer(
    initialState,
    on(GlobalSpinnerActions.OnSpinner, () => true),
    on(GlobalSpinnerActions.OffSpinner, () => false),
  )
  