import { Observable } from 'rxjs/Observable'
import { Component, OnInit, ViewChild, OnDestroy, Output, EventEmitter } from '@angular/core'
import { Location } from '@angular/common'
import { Router } from '@angular/router'
import { Store } from '@ngrx/store'
import { AppState } from './../../../app.state'
import * as ProjectActions from './../../store/project.actions'
import { EventEmitterService } from '../../services/event-emitter.service'
import { RestService } from '../../services/rest.service'
import { AuthenticationService } from '../../services/authentication.service'
import { CheckCircleComponent } from '../widgets/check-circle/check-circle.component'
import { Project } from './../../store/models'
import { Subject, Subscription } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog/confirm-dialog.component'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog'
import * as GlobalAppConfigurationActions from './../../store/actions/global-app-configuration.actions'

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild(CheckCircleComponent) checkCircle: CheckCircleComponent
  @Output() toggleSidebar: EventEmitter<any> = new EventEmitter()

  private subscription: Subscription
  project: Observable<Project>
  mutable = true
  name = ''
  projects: Project[] = null
  selectedProject: Project

  private unSubscribe$ = new Subject()

  constructor(private store: Store<AppState>, private eventEmitterService: EventEmitterService, private authenticationService: AuthenticationService, private restService: RestService, private router: Router, private dialog: MatDialog, private location: Location) {
    this.project = this.store.select('project')
    this.subscription = this.project.pipe(takeUntil(this.unSubscribe$)).subscribe((data) => {
      this.mutable = data.mutable
      this.name = data.name
      this.selectedProject = data
      if (this.projects) {
        const projectAfterUpdate = this.projects.findIndex(({uuid}) => uuid === data.uuid)
        projectAfterUpdate !== -1 ? this.projects[projectAfterUpdate] = { ...data } : ''
      }
    })

    this.authenticationService.currentUser.pipe(takeUntil(this.unSubscribe$)).subscribe((user) => {
      this.projects = null

      if (user) {
        this.restService.getUserProjects().pipe(takeUntil(this.unSubscribe$)).subscribe((response) => {
          this.projects = response.results

          let projects = []

          for (let key in response.results) {
            let obj = {
              name: response.results[key].name,
              uuid: response.results[key].uuid,
              mutable: response.results[key].mutable,
              ...response.results[key].data,
            } as Project

            projects.push(obj)
          }

          this.projects = projects
        })
      }
    })
  }

  ngOnInit(): void {}

  compareObjects(o1: any, o2: any): boolean {
    return o1.uuid === o2.uuid
  }

  showDelete() {
    if(this.projects && this.selectedProject) {
      return this.projects.find(({uuid}) => uuid === this.selectedProject.uuid)
    }
    return false
  }

  projectSave(): void {
    this.checkCircle.showCircle()
    this.store.dispatch(GlobalAppConfigurationActions.OnComposeMode())
    this.eventEmitterService.broadcast('save:project', {})
  }

  ngOnDestroy() {
    this.unSubscribe$.next(true)
    this.unSubscribe$.complete()
  }

  updateName() {
    if (this.selectedProject && this.projects) {
      const cuurentProject = this.projects.find(({uuid}) => uuid === this.selectedProject.uuid)
      cuurentProject ? cuurentProject.name = this.name : ''
    }
    this.store.dispatch(ProjectActions.UpdateName({ data: this.name }))
    this.store.dispatch(ProjectActions.SaveProject())
  }

  selectProject({value: projectData}): void {
    this.store.dispatch(GlobalAppConfigurationActions.OnComposeMode())
    this.selectedProject = projectData
    this.name = projectData.name
    this.eventEmitterService.broadcast('initialize:node', {})
    this.store.dispatch(ProjectActions.SaveProjectSuccess({ data: projectData }))
    this.router.navigate(['/', `${projectData.uuid}`])
  }

  removeProject() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm delete',
        content: 'Are you sure want to delete this project?',
      },
    })

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe((result: true) => {
        if (result == true) {
          this.restService.removeProject(this.selectedProject.uuid).pipe(takeUntil(this.unSubscribe$)).subscribe((response) => {
            if (this.projects) {
              const index = this.projects.findIndex(({uuid}) => uuid === this.selectedProject.uuid)
              this.projects.splice(index, 1)
            }

            location.href = '/'
          })
        }
      })
  }
}

