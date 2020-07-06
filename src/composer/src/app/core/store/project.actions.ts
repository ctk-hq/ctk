import { createAction, props } from '@ngrx/store'
import { IPosition, Service, Volume, Network, ImportPayload } from './models'

export const SET_INITIAL_STATE = '[PROJECT] Set initial state'

export const GET_SERVICES = '[PROJECT] Get services'
export const SET_SERVICES = '[PROJECT] Set services'
export const CREATE_SERVICE = '[PROJECT] Create service'
export const UPDATE_SERVICE = '[PROJECT] Update service'
export const REMOVE_SERVICE = '[PROJECT] Remove service'

export const GET_POSITIONS = '[PROJECT] Get positions'
export const SET_POSITIONS = '[PROJECT] Set positions'
export const CREATE_POSITION = '[PROJECT] Create position'
export const UPDATE_POSITION = '[PROJECT] Update position'
export const REMOVE_POSITION = '[PROJECT] Remove position'

export const GET_VOLUMES = '[PROJECT] Get volumes'
export const SET_VOLUMES = '[PROJECT] Set volumes'
export const CREATE_VOLUME = '[PROJECT] Create volume'
export const UPDATE_VOLUME = '[PROJECT] Update volume'
export const REMOVE_VOLUME = '[PROJECT] Remove volume'

export const GET_NETWORKS = '[PROJECT] Get network'
export const SET_NETWORKS = '[PROJECT] Set network'
export const CREATE_NETWORKS = '[PROJECT] Create network'
export const UPDATE_NETWORKS = '[PROJECT] Update network'
export const REMOVE_NETWORKS = '[PROJECT] Remove network'

export const SET_VERSION = '[PROJECT] Set version'

export const SAVE_PROJECT = '[PROJECT] Save project'
export const SAVE_PROJECT_SUCCESS = '[PROJECT] Save project success'
export const UPLOAD_PROJECT = '[PROJECT] Upload project'

export const API_PROJECT_REQUEST_FAIL = '[PROJECT] Api project request fail'

export const UPDATE_VERSION = '[PROJECT] Update version'

export const IMPORT_PROJECT = '[PROJECT] Import project'
export const IMPORT_CURRENT_PROJECT = '[PROJECT] Import current project'

export const UPDATE_NAME = '[PROJECT] Update project name'

export const VIEW_RECIPE = '[PROJECT] View recipe'

export const SetInitialState = createAction(SET_INITIAL_STATE)

export const GetServices = createAction(GET_SERVICES)
export const SetServices = createAction(SET_SERVICES, props<{ data: Service[] }>())
export const CreateService = createAction(CREATE_SERVICE, props<{ data: Service }>())
export const UpdateService = createAction(UPDATE_SERVICE, props<{ data: Service }>())
export const RemoveService = createAction(REMOVE_SERVICE, props<{ data: Service }>())

export const GetPositions = createAction(GET_POSITIONS)
export const SetPositions = createAction(SET_POSITIONS, props<{ data: IPosition[] }>())
export const CreatePosition = createAction(CREATE_POSITION, props<{ data: IPosition }>())
export const UpdatePosition = createAction(UPDATE_POSITION, props<{ data: IPosition }>())
export const RemovePosition = createAction(REMOVE_POSITION, props<{ data: IPosition }>())

export const GetVolumes = createAction(GET_VOLUMES)
export const SetVolumes = createAction(SET_VOLUMES, props<{ data: Volume[] }>())
export const CreateVolume = createAction(CREATE_VOLUME, props<{ data: Volume }>())
export const UpdateVolume = createAction(UPDATE_VOLUME, props<{ data: Volume }>())
export const RemoveVolume = createAction(REMOVE_VOLUME, props<{ data: Volume }>())

export const GetNetwork = createAction(GET_NETWORKS)
export const SetNetwork = createAction(SET_NETWORKS, props<{ data: Network }>())
export const CreateNetwork = createAction(CREATE_NETWORKS, props<{ data: Network }>())
export const UpdateNetwork = createAction(UPDATE_NETWORKS, props<{ data: Network }>())
export const RemoveNetwork = createAction(REMOVE_NETWORKS, props<{ data: Network }>())

export const ApiProjectRequestFail = createAction(API_PROJECT_REQUEST_FAIL, props<{ data: Error }>())
export const UploadProject = createAction(UPLOAD_PROJECT, props<{ data: string }>())
export const SaveProject = createAction(SAVE_PROJECT)
export const SaveProjectSuccess = createAction(SAVE_PROJECT_SUCCESS, props<{ data: any }>())

export const UpdateVersion = createAction(UPDATE_VERSION, props<{ data: number }>())

export const ImportProject = createAction(IMPORT_PROJECT, props<{ data: ImportPayload }>())
export const ImportCurrentProject = createAction(IMPORT_CURRENT_PROJECT, props<{ data: ImportPayload }>())

export const UpdateName = createAction(UPDATE_NAME, props<{ data: string }>())

export const ViewRecipe = createAction(VIEW_RECIPE, props<{ data: string }>())