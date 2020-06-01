import { createReducer, on } from '@ngrx/store'
import { Project, Service, Volume } from './models'
import * as ProjectActions from './project.actions'

export const initialState: Project = {
  uuid: null,
  name: null,
  mutable: true,
  canvas: [],
  version: 3,
  volumes: [],
  services: [],
  networks: [],
  secrets: [],
  configs: [],
}

export function onUpdate(state, data) {
  let newState = [...state]
  const index = newState.findIndex((item) => item.uuid === data.uuid)

  if (index > -1) newState[index] = data

  return newState
}

export function onCreate(state, data) {
  return [...state, data]
}

export function onDelete(state, data) {
  let newState = [...state]
  const index = newState.findIndex((service) => service.uuid === data.uuid)

  if (index > -1) newState.splice(index, 1)

  return newState
}

export const projectReducer = createReducer(
  initialState,
  on(ProjectActions.SetInitialState, (state) => ({ ...initialState })),

  on(ProjectActions.GetServices, (state) => ({ ...state })),
  on(ProjectActions.SetServices, (state, { data }) => ({ ...state, services: data })),
  on(ProjectActions.CreateService, (state, { data }) => {
    let obj = {} as Service
    obj['uuid'] = data.uuid
    obj['name'] = data.name
    obj['image'] = data.image
    obj['tag'] = data.tag
    Object.preventExtensions(obj)
    return {
      ...state,
      services: [...state.services, obj],
    }
  }),
  on(ProjectActions.UpdateService, (state, { data }) => ({ ...state, services: onUpdate(state.services, data) })),
  on(ProjectActions.RemoveService, (state, { data }) => ({ ...state, services: onDelete(state.services, data) })),

  on(ProjectActions.GetPositions, (state) => ({ ...state })),
  on(ProjectActions.SetPositions, (state, { data }) => ({ ...state, canvas: data })),
  on(ProjectActions.CreatePosition, (state, { data }) => ({ ...state, canvas: onCreate(state.canvas, data) })),
  on(ProjectActions.UpdatePosition, (state, { data }) => ({ ...state, canvas: onUpdate(state.canvas, data) })),
  on(ProjectActions.RemovePosition, (state, { data }) => ({ ...state, canvas: onDelete(state.canvas, data) })),

  on(ProjectActions.GetVolumes, (state) => ({ ...state })),
  on(ProjectActions.SetVolumes, (state, { data }) => ({ ...state, volumes: data })),
  on(ProjectActions.CreateVolume, (state, { data }) => ({ ...state, volumes: onCreate(state.volumes, data) })),
  on(ProjectActions.UpdateVolume, (state, { data }) => ({ ...state, volumes: onUpdate(state.volumes, data) })),
  on(ProjectActions.RemoveVolume, (state, { data }) => {
    let newServices = [...state.services]
    newServices = newServices.map((service: Service) => {

      if (service.volumes) {
        let newVolumes = [...service.volumes]
        const index = newVolumes.findIndex((volume: { volume: string; destination: string }) => volume.volume === data.uuid)
        if (index > -1) newVolumes.splice(index, 1)
        return {...service, volumes: [...newVolumes]}
      } else {
        return {...service, volumes: []}
      }
    })
    return { ...state, volumes: onDelete(state.volumes, data), services: newServices }
  }),

  on(ProjectActions.GetNetwork, (state) => ({ ...state })),
  //on(ProjectActions.SetNetwork, (state, { data }) => ({ ...state, networks: data })),
  on(ProjectActions.CreateNetwork, (state, { data }) => ({ ...state, networks: onCreate(state.networks, data) })),
  on(ProjectActions.UpdateNetwork, (state, { data }) => ({ ...state, networks: onUpdate(state.networks, data) })),
  on(ProjectActions.RemoveNetwork, (state, { data }) => {
    let newServices = [...state.services]
    newServices = newServices.map((service: Service) => {

      if (service.networks) {
        let newNetworks = [...service.networks]
        const index = newNetworks.findIndex((network: { network: string; destination: string }) => network.network === data.uuid)
        if (index > -1) newNetworks.splice(index, 1)
        return {...service, volumes: [...newNetworks]}
      } else {
        return {...service, newNetworks: []}
      }
    })
    return { ...state, networks: onDelete(state.networks, data), services: newServices }
  }),

  on(ProjectActions.SaveProjectSuccess, (state, { data }) => {
    let forSpread = {}
    forSpread = Object.assign(forSpread, data)

    return {
      ...state,
      ...forSpread,
    }
  }),
  on(ProjectActions.ApiProjectRequestFail, (state, { data }) => {
    return {}
  }),
  on(ProjectActions.UpdateVersion, (state, { data }) => ({ ...state, version: data })),
  on(ProjectActions.UpdateName, (state, { data }) => ({ ...state, name: data})),
)
