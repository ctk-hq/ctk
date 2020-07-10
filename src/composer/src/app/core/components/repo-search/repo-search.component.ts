import { Component, OnInit, OnDestroy, Inject, HostListener, Output, EventEmitter } from '@angular/core'
import { Observable } from 'rxjs/Observable'
import { Store } from '@ngrx/store'
import { Subscription, Subject } from 'rxjs'
import { FormGroup, FormControl } from '@angular/forms'
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { AppState } from './../../../app.state'
import { Project, RepoDetailsData, Service, IPosition } from './../../store/models'
import * as ProjectActions from './../../store/project.actions'
import { RestService } from './../../services/rest.service'
import { uuidv4 } from '../../utils/utils'
import * as GlobalSpinnerActions from './../../store/actions/global-spinner.actions'
import { NodeService } from '../canvas/jsplumb/node.service'
import { takeUntil } from 'rxjs/operators'

@Component({
  selector: 'app-repo-search',
  templateUrl: './repo-search.component.html',
  styleUrls: ['./repo-search.component.scss'],
})
export class RepoSearchComponent implements OnInit, OnDestroy {
  searchForSubscription: Subscription
  form: FormGroup = new FormGroup({ searchFor: new FormControl('') })
  project: Observable<Project>

  nextPage: number = 1
  prevSearchQ: string = ''
  name = new FormControl('')
  images = []
  repoDetailsData = {}

  showSpinner: boolean = false

  leftPosition: number = 200
  POSITION_INCREMENT: number = 20

  private unSubscribe$ = new Subject()

  get searchFor() {
    return this.form.get('searchFor').value
  }

  constructor(private store: Store<AppState>, public rest: RestService, public dialog: MatDialog, private nodeService: NodeService) {
    this.project = store.select('project')
  }

  showRepoDetails(repo_name: string): void {
    this.store.dispatch(GlobalSpinnerActions.OnSpinner())
    this.rest
      .getRepoDetails(repo_name)
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe((data: {}) => {
        let full_description = data['full_description']
        data['full_description'] = full_description
        this.repoDetailsData = data

        const dialogRef = this.dialog.open(DialogDetails, {
          width: '800px',
          data: this.repoDetailsData,
        })
        dialogRef.componentInstance.onAddProject.pipe(takeUntil(this.unSubscribe$)).subscribe(() => {
          this.addToProject(data)
        })
        this.store.dispatch(GlobalSpinnerActions.OffSpinner())
      })
  }

  onClickOnImageCard(event, repo_name) {
    const onClickOnAddButton = event.target.nodeName === 'BUTTON' || event.target.nodeName === 'SPAN'
    onClickOnAddButton ? this.onAddToProject(repo_name) : this.showRepoDetails(repo_name)
  }

  addToProject(data: {}) {
    const uuid = uuidv4()
    let imageName = data['name']

    if (data['namespace'] && data['namespace'] !== 'library') {
      imageName = data['namespace'] + '/' + imageName
    }
    const postfix = uuid.split('-')[2]

    this.store.dispatch(
      ProjectActions.CreateService({
        data: {
          uuid,
          user: null,
          working_dir: null,
          domainname: null,
          hostname: null,
          ipc: null,
          mac_address: null,
          privileged: null,
          read_only: null,
          shm_size: null,
          stdin_open: null,
          tty: null,
          name: data['serviceName'] ? `${data['serviceName']}_${postfix}` : `${data['name']}_${postfix}`,
          container_name: null,
          deploy: null,
          image: imageName,
          restart: null,
          secrets: null,
          ports: null,
          environment: null,
          links: null,
          depends_on: null,
          labels: null,
          env_file: null,
          build: null,
          cap_add: null,
          cap_drop: null,
          cgroup_parent: null,
          command: null,
          args: null,
          configs: null,
          credential_spec: null,
          devices: null,
          dns: null,
          dns_search: null,
          entrypoint: null,
          expose: null,
          external_links: null,
          extra_hosts: null,
          healthcheck: null,
          logging: null,
          network_mode: null,
          networks: null,
          isolation: null,
          init: null,
          volumes: null,
          tag: data['tag'] ? data['tag'] : 'latest',
        },
      }),
    )

    const positionData: IPosition = {
      uuid,
      top: 200,
      left: this.leftPosition,
      zoomLevel: 1,
    }
    this.leftPosition += this.POSITION_INCREMENT

    this.store.dispatch(
      ProjectActions.CreatePosition({
        data: positionData,
      }),
    )
    this.nodeService.addDynamicNode(positionData)
  }

  onAddToProject(repo_name: string): void {
    this.store.dispatch(GlobalSpinnerActions.OnSpinner())
    this.rest
      .getRepoDetails(repo_name)
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe((data: {}) => {
        this.addToProject(data)
      })
  }

  onEnter() {
    const searchValue = this.form.get('searchFor').value

    if (searchValue.length > 1) {
      this.showSpinner = true

      this.nextPage = 1
      this.prevSearchQ = searchValue

      this.rest
        .searchRepos(searchValue, this.nextPage)
        .pipe(takeUntil(this.unSubscribe$))
        .subscribe((data: {}) => {
          data['next'] ? this.nextPage++ : (this.nextPage = null)

          this.images = data['results']
          this.showSpinner = false
        })
    }
  }
  loadMore() {
    this.showSpinner = true
    this.rest
      .searchRepos(this.prevSearchQ, this.nextPage)
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe((data: {}) => {
        data['next'] ? this.nextPage++ : (this.nextPage = null)

        const localCopyArrayOfImagesForMerge = this.images.map((image) => image)

        data['results'].forEach((image) => {
          const index = localCopyArrayOfImagesForMerge.findIndex(({ repo_name: prevName }) => image.repo_name === prevName)
          index === -1 ? this.images.push(image) : ''
        })

        this.showSpinner = false
      })
  }

  ngOnInit(): void {
    this.form
      .get('searchFor')
      .valueChanges.pipe(takeUntil(this.unSubscribe$))
      .subscribe((val) => {
        const formattedMessage = val
      })
  }

  ngOnDestroy() {
    this.unSubscribe$.next(true)
    this.unSubscribe$.complete()
  }

  addCustom(): void {
    const dialogRef = this.dialog.open(DialogAddCustom, {
      width: '400px'
    })
    dialogRef.componentInstance.onAddProject.pipe(takeUntil(this.unSubscribe$)).subscribe((data) => {
      this.addToProject(data)
      dialogRef.close()
    })
  }
}

@Component({
  selector: 'dialog-details',
  templateUrl: 'dialog-details.html',
  styleUrls: ['./dialog-details.scss'],
})
export class DialogDetails {
  @Output() onAddProject = new EventEmitter()
  constructor(public dialogRef: MatDialogRef<DialogDetails>, @Inject(MAT_DIALOG_DATA) public data: RepoDetailsData) {}

  onNoClick(): void {
    this.dialogRef.close()
  }

  addProject() {
    this.onAddProject.emit()
  }
}

@Component({
  selector: 'dialog-add-custom',
  templateUrl: 'dialog-add-custom.html',
  styleUrls: ['./dialog-add-custom.scss'],
})
export class DialogAddCustom {
  @Output() onAddProject = new EventEmitter()
  imageName: string
  tag: string
  serviceName: string
  constructor(public dialogRef: MatDialogRef<DialogDetails>) {}

  addProject() {
    this.onAddProject.emit({name: this.imageName, tag: this.tag, serviceName: this.serviceName})
  }
}
