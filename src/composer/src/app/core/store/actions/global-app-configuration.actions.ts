import { createAction } from '@ngrx/store'

export const ON_COMPOSE_MODE = '[GLOBAL_CONFIGURATION] Compose mode'
export const ON_IMPORT_MODE = '[GLOBAL_CONFIGURATION] Import mode'
export const ON_RECIPE_LOAD_MODE = '[GLOBAL_CONFIGURATION] Recipe load mode'

export const OnComposeMode = createAction(ON_COMPOSE_MODE)
export const OnImportMode = createAction(ON_IMPORT_MODE)
export const OnRecipeLoadMode = createAction(ON_RECIPE_LOAD_MODE)