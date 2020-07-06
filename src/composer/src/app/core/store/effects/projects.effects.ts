import { Injectable } from '@angular/core'
import { Location } from '@angular/common'
import { Router } from '@angular/router'

import { Effect, Actions, ofType } from '@ngrx/effects'
import { of } from 'rxjs/observable/of'
import { map, switchMap, catchError, withLatestFrom } from 'rxjs/operators'
import { Store } from '@ngrx/store'

import { AppState } from '../../../app.state'
import * as ProjectActions from '../project.actions'
import * as GlobalError from '../actions/global-dialog.actions'
import * as globalAppConfiguration from '../actions/global-app-configuration.actions'
import { RestService } from '../../services/rest.service'
import { EventEmitterService } from '../../services/event-emitter.service'

@Injectable()
export class ProjectEffects {
  constructor(private actions$: Actions, private restService: RestService, private store: Store<AppState>, private location: Location, private eventEmitterService: EventEmitterService, private router: Router) {}
  @Effect()
  ViewProject$ = this.actions$.pipe(
    ofType(ProjectActions.ViewRecipe),
    switchMap(({ data }) => {
      return this.restService.getRecipe(data).pipe(
        map((projectData) => {
          const project = {
            name: projectData.name,
            uuid: projectData.uuid,
            mutable: projectData.mutable,
            ...projectData.data,
          }
          this.eventEmitterService.broadcast('initialize:node', {})
          this.eventEmitterService.broadcast('load: code', projectData.code)
          return ProjectActions.SaveProjectSuccess({ data: project })
        }),
        catchError((error) => {
          if (error.status >= 500) return of(GlobalError.ServerError({message: error.error, _type: 'Error'}))
          else return of(ProjectActions.ApiProjectRequestFail({ data: error }))
        })
      )
    }),
  )

  @Effect()
  ImportPoject$ = this.actions$.pipe(
    ofType(ProjectActions.ImportProject),
    switchMap(({ data }) => {
      let payload = {}
      payload[data.type] = data.payload
      return this.restService.importProject(payload).pipe(
        map((projectData) => {
          const project = {
            name: projectData.name,
            uuid: projectData.uuid,
            mutable: projectData.mutable,
            ...projectData.data,
          }
          this.eventEmitterService.broadcast('load: code', projectData.code)
          return ProjectActions.SaveProjectSuccess({ data: project })
        }),
        catchError((error) => {
          if (error.status >= 500) return of(GlobalError.ServerError({message: error.error, _type: 'Error'}))
          else return of(ProjectActions.ApiProjectRequestFail({ data: error }))
        })
      )
    }),
  )

  @Effect()
  ImportCurrentPoject$ = this.actions$.pipe(
    ofType(ProjectActions.ImportCurrentProject),
    withLatestFrom(this.store.select('project')),
    switchMap(([action, payload]) => {
      const currentProject = {
        name: payload.name,
        uuid: payload.uuid,
        mutable: payload.mutable,
        data: {
          canvas: payload.canvas,
          version: payload.version,
          volumes: payload.volumes,
          services: payload.services,
          networks: payload.networks,
          secrets: payload.secrets,
        },
      }

      return this.restService.importProject({project_data: currentProject, yaml: action.data.payload}).pipe(
        map((projectData) => {
          if(projectData.code) {
            const project = {
              name: currentProject.name ? currentProject.name : projectData.name,
              uuid: currentProject.uuid,
              mutable: projectData.mutable,
              ...projectData.data,
            }
            this.eventEmitterService.broadcast('load: code', projectData.code)
            this.store.dispatch(ProjectActions.SaveProjectSuccess({ data: project }))
            return ProjectActions.SaveProject()
          } else {
            const { name, uuid, mutable } = currentProject
            this.eventEmitterService.broadcast('load: code', projectData.code)
            this.store.dispatch(ProjectActions.SetInitialState())
            this.store.dispatch(ProjectActions.SaveProjectSuccess({ data: { uuid, name, mutable} }))
            return ProjectActions.SaveProject()
          }
        }),
        catchError((error) => {
          if (error.status >= 500) return of(GlobalError.ServerError({message: `${error.error}`, _type: 'Error'}))
          else if (error.status > 401) return of(globalAppConfiguration.OnImportMode(), GlobalError.ServerError({message: error.error, _type: 'Error'}))
          else return of(ProjectActions.ApiProjectRequestFail({ data: error }))
        })
      )
    }),
  )

  @Effect()
  UploadProject$ = this.actions$.pipe(
    ofType(ProjectActions.UploadProject),
    switchMap(({ data }) => {
      return this.restService.getProject(data).pipe(
        map((projectData) => {
          const project = {
            name: projectData.name,
            uuid: projectData.uuid,
            mutable: projectData.mutable,
            ...projectData.data,
          }
          return ProjectActions.SaveProjectSuccess({ data: project })
        }),
        catchError((error) => {
          if (error.status === 404) return of(GlobalError.ProjectNotFound({message: `Project with id: ${data} does not exist, or is private.`, _type: 'Error'}))
          else if (error.status >= 500) return of(GlobalError.ServerError({message: `Server encountered an error:${error.message}`, _type: 'Error'}))
          else return of(ProjectActions.ApiProjectRequestFail({ data: error }))
        })
      )
    }),
  )

  @Effect()
  SaveProject$ = this.actions$.pipe(
    ofType(ProjectActions.SAVE_PROJECT),
    withLatestFrom(this.store.select('project')),
    switchMap(([action, payload]) => {
      const currentProject = {
        name: payload.name ? payload.name : `New project`,
        data: {
          canvas: payload.canvas,
          version: payload.version,
          volumes: payload.volumes,
          services: payload.services,
          networks: payload.networks,
          secrets: payload.secrets,
        },
      }

      if (payload.uuid && payload.mutable) {
        return this.restService.saveProject(currentProject, payload.uuid).pipe(
          map((projectData) => {
            const project = {
              name: projectData.name,
              mutable: projectData.mutable,
              ...projectData.data,
            }
            return ProjectActions.SaveProjectSuccess({ data: project })
          }),
          catchError((error) => of(ProjectActions.ApiProjectRequestFail({ data: error }))),
        )
      } else {
        return this.restService.createProject(currentProject).pipe(
          map((projectData) => {
            const project = {
              name: projectData.name,
              uuid: projectData.uuid,
              mutable: projectData.mutable,
              ...projectData.data,
            }
            window.location.href = `/${projectData.uuid}`
            return ProjectActions.SaveProjectSuccess({ data: project })
          }),
          catchError((error) => of(ProjectActions.ApiProjectRequestFail({ data: error }))),
        )
      }
    }),
  )
}
