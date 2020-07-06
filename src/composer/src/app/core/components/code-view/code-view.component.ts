import { Component, OnInit, OnDestroy } from '@angular/core'
import { Router, Params, ActivatedRoute } from '@angular/router'
import { Observable } from 'rxjs/Observable'
import { Store } from '@ngrx/store'
import { MatDialog } from '@angular/material/dialog'
import { Project, GlobalAppConfiguration } from './../../store/models'
import { AppState } from './../../../app.state'
import { RestService } from './../../services/rest.service'
import * as ProjectActions from './../../store/project.actions'
import * as GlobalAppConfigurationActions from './../../store/actions/global-app-configuration.actions'
import * as GlobalDialogActions from './../../store/actions/global-dialog.actions'
import { EventEmitterService } from 'src/app/core/services/event-emitter.service'
import * as GlobalSpinnerActions from './../../store/actions/global-spinner.actions'
import { Subject } from 'rxjs'
import { takeUntil, throttleTime } from 'rxjs/operators'
import { ImportDialogComponent } from '../dialogs/import-dialog/import-dialog.component'

const THROTTLE_TIMEOUT = 1000

interface Version {
  value: number
  title: string
}

@Component({
  selector: 'app-code-view',
  templateUrl: './code-view.component.html',
  styleUrls: ['./code-view.component.scss'],
})
export class CodeViewComponent implements OnInit, OnDestroy {
  globalConfig: Observable<GlobalAppConfiguration>
  mode: string
  project: Observable<Project>
  code: ''
  codeFormat: string = 'yaml'
  versions: Version[] = [
    { value: 1, title: 'version 1' },
    { value: 2, title: 'version 2' },
    { value: 3, title: 'version 3' },
  ]
  specificVersions: Version[] = [
    { value: 1, title: 'version 1' },
    { value: 2, title: 'version 2' },
    { value: 3, title: 'version 3' },
  ]
  selectedVersion: Version = { value: 0, title: 'unSelected' }
  selectedSpecificVersion: Version = { value: 3, title: 'version 3' }

  buttonText: string = 'Copy'
  showSpinner: boolean = false

  importUrl: string = null
  recipeToLoadUuid: string = null

  private unSubscribe$ = new Subject()

  extraKeys = {
    'Tab': cm => cm.replaceSelection('  '),
    "Ctrl-S": () => this.changeMode(), //save current project like "done"
    "Cmd-S": () => this.changeMode() //save current project like "done"
  }

  constructor(private store: Store<AppState>, public rest: RestService, private eventEmitterService: EventEmitterService, public dialog: MatDialog, private router: Router, private activatedRoute: ActivatedRoute) {
    this.project = store.select('project')
    this.globalConfig = store.select('globalAppConfiguration')

    this.globalConfig.pipe(takeUntil(this.unSubscribe$)).subscribe(({mode}) => {
      this.mode = mode
    })
  }

  codeRefresh(): void {
    if (this.mode === 'compose') {
      this.eventEmitterService.broadcast('save:project', {})
    } else if (this.mode === 'import') {
      if (!this.importUrl) {
        this.store.dispatch(GlobalDialogActions.ProjectNotFound({ message: 'Import url is empty<br>Click on the Link button top right corner', _type: 'Error'}))
      } else {
        this.store.dispatch(GlobalSpinnerActions.OnSpinner())
        this.store.dispatch(ProjectActions.ImportProject({data: {type: 'url', payload: this.importUrl}}))
        this.eventEmitterService.broadcast('initialize:node', {})
      }
    }
  }

  ngOnInit(): void {
    const importUrl = this.activatedRoute.snapshot.queryParams['import_url']
    const loadRecipeUrl = this.activatedRoute.snapshot.queryParams['recipe']

    if (importUrl) {
      this.importUrl = importUrl
      this.store.dispatch(GlobalAppConfigurationActions.OnImportMode())
      this.codeRefresh()
    }

    if (loadRecipeUrl) {
      this.recipeToLoadUuid = loadRecipeUrl
      this.store.dispatch(GlobalAppConfigurationActions.OnRecipeLoadMode())
    }

    this.project.pipe(takeUntil(this.unSubscribe$), throttleTime(THROTTLE_TIMEOUT, undefined, { trailing: true, leading: true})).subscribe((data) => {
      if (this.mode === 'compose') {
        const sendData = {
          name: data.name,
          data: {
            version: data.version,
            volumes: data.volumes,
            services: data.services,
            networks: data.networks,
            secrets: data.secrets,
            configs: data.configs,
          },
        }
        this.showSpinner = true
        this.rest
          .generateCode(sendData)
          .pipe(takeUntil(this.unSubscribe$))
          .subscribe((data: {}) => {
            for (var i = 0; i < data['code'].length; ++i) {
              data['code'][i] = data['code'][i].replace(/(\r\n|\n|\r)/gm, '')
            }

            this.code = data['code'].join('\n')

            if (data['code_format']) {
              this.codeFormat = data['code_format']
            }

            this.showSpinner = false
          })
      }
    })

    this.eventEmitterService.subscribe('load: code', (code) => {
      this.code = code
    })
  }

  changeVersion(type: string): void {
    if (type === 'select') {
      this.selectedVersion = { value: 0, title: 'unSlected' }
      this.store.dispatch(ProjectActions.UpdateVersion({ data: this.selectedSpecificVersion.value }))
    } else if (type === 'toggle') {
      this.selectedSpecificVersion = { value: 0, title: 'Select version' }
      this.store.dispatch(ProjectActions.UpdateVersion({ data: this.selectedVersion.value }))
    }
  }

  changeButtonText() {
    this.buttonText = 'Copied'
    setTimeout(() => (this.buttonText = 'Copy'), 5000)
  }

  ngOnDestroy() {
    this.unSubscribe$.next(true)
    this.unSubscribe$.complete()
  }

  changeMode() {
    if (this.mode === 'compose') this.store.dispatch(GlobalAppConfigurationActions.OnImportMode())
    else {
      this.store.dispatch(ProjectActions.ImportCurrentProject({data: {type: 'yaml', payload: this.code}}))
      this.eventEmitterService.broadcast('initialize:node', {})
      this.store.dispatch(GlobalAppConfigurationActions.OnComposeMode())
    }
  }

  openImportDialog() {
    const importDialog = this.dialog.open(ImportDialogComponent, {
      data: { importUrl: this.importUrl },
      width: '800px'
    })
    importDialog.componentInstance.onImport.pipe(takeUntil(this.unSubscribe$)).subscribe((importUrl) => {
      this.store.dispatch(GlobalAppConfigurationActions.OnImportMode())
      this.importUrl = importUrl
      const queryParams: Params = { import_url: importUrl }
      this.router.navigate(
        ['/'],
        {
          relativeTo: this.activatedRoute,
          queryParams: queryParams,
          queryParamsHandling: 'merge', // remove to replace all query params by provided
        })
      !this.activatedRoute.snapshot.params['uuid'] ? this.codeRefresh() : ''
      this.eventEmitterService.broadcast('initialize:node', {})
    })
  }

  handelEditorClick() {
    this.store.dispatch(GlobalAppConfigurationActions.OnImportMode())
  }

  handelFocusout() {
    this.store.dispatch(GlobalAppConfigurationActions.OnComposeMode())
  }
}
