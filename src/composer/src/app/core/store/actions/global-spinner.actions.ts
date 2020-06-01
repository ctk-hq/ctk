import { createAction } from '@ngrx/store'

export const ON_SPINNER = '[GLOBAL_SPINNER] On spinner'
export const OFF_SPINNER = '[GLOBAL_SPINNER] Off spinner'

export const OnSpinner = createAction(ON_SPINNER)
export const OffSpinner = createAction(OFF_SPINNER)