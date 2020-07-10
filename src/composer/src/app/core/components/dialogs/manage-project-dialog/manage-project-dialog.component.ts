import { Component, OnInit, Inject, ViewChild, OnDestroy } from '@angular/core'
import { FormControl, Validators, FormGroup, FormBuilder, AbstractControl } from '@angular/forms'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { Service, Project, Volume, ServicePort, Network } from '../../../store/models'
import { Store } from '@ngrx/store'
import * as ProjectActions from './../../../store/project.actions'
import { AppState } from 'src/app/app.state'
import { Observable, Subscription, Subject } from 'rxjs'
import { RestService } from './../../../services/rest.service'
import { CheckCircleComponent } from '../../widgets/check-circle/check-circle.component'
import { KeyValueComponent } from '../../common/key-value/key-value/key-value.component'
import { EventEmitterService } from 'src/app/core/services/event-emitter.service'
import { takeUntil } from 'rxjs/operators'

@Component({
  selector: 'app-manage-project-dialog',
  templateUrl: './manage-project-dialog.component.html',
  styleUrls: ['./manage-project-dialog.component.scss'],
})
export class ManageProjectDialogComponent implements OnInit, OnDestroy {
  @ViewChild(CheckCircleComponent) checkCircle: CheckCircleComponent
  @ViewChild('envVars') envVars: KeyValueComponent
  @ViewChild('labels') labels: KeyValueComponent

  formGeneral: FormGroup
  isLoading: boolean = false
  subscriptions: Subscription[] = []
  project: Observable<Project>
  volumes: Volume[]
  ports: ServicePort[]
  serviceName = ''

  currentPortSets: {
    target: FormControl
    published: FormControl
    protocol: FormControl
    mode: FormControl
  }[] = []

  protocols: string[] = ['tcp', 'udp']
  modes: string[] = ['host', 'ingress']

  currentVolumeSets: {
    selected: string
    relativePathSource: FormControl
    formDestination: FormControl
  }[] = []

  tags: string[] = ['latest']
  nextTagPage: number = 1
  restartOptions: string[] = ['always', 'no', 'on-failure', 'unless-stopped']

  otherImagesInCurrentProject: any[] = []
  networks: Network[]

  private unSubscribe$ = new Subject()

  constructor(
    private store: Store<AppState>,
    public dialogRef: MatDialogRef<ManageProjectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Service,
    private formBuilder: FormBuilder,
    public rest: RestService,
    private eventEmitterService: EventEmitterService,
  ) {
    this.serviceName = this.data.name
    this.formGeneral = this.formBuilder.group({
      image: new FormControl( this.data.image, Validators.required),
      name: new FormControl('', [Validators.required, this.serviceNameAlreadyExistsValidator]),
      tag: new FormControl('', [Validators.required]),
      restart: new FormControl('', [Validators.required]),
      container_name: new FormControl(''),
      command: new FormControl(''),
      entrypoint: new FormControl(''),
      working_dir: new FormControl(''),
      depends_on: new FormControl(),
      links: new FormControl(),
      networks: new FormControl(),
    })

    this.project = this.store.select('project')

    const sub = this.project.pipe(takeUntil(this.unSubscribe$)).subscribe((v) => {
      this.volumes = v.volumes
      this.networks = v.networks
      this.otherImagesInCurrentProject = []

      v.services.forEach((service) => {
        if (this.data.uuid !== service.uuid)
          this.otherImagesInCurrentProject.push({
            uuid: service.uuid,
            name: service.name,
          })
      })
    })

    this.subscriptions.push(sub)

    this.data.ports
      ? this.data.ports.forEach((p: any) => {
          this.currentPortSets.push({
            target: new FormControl(p.target),
            published: new FormControl(p.published),
            protocol: new FormControl(p.protocol),
            mode: new FormControl(p.mode),
          })
        })
      : (this.currentPortSets = [])

    this.data.volumes
      ? this.data.volumes.forEach((v: any) => {
          const selected = this.volumes.find((vol) => vol.uuid === v.volume)
          this.currentVolumeSets.push({
            formDestination: new FormControl(v.destination),
            relativePathSource: new FormControl(v.relativePathSource),
            selected: selected ? selected.uuid : null,
          })
        })
      : (this.currentVolumeSets = [])

    this.data.tag ? (this.tags[0] = this.data.tag) : ''

    this.dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe(() => {
        this.subscriptions.forEach((sub) => sub.unsubscribe())
      })
  }

  ngOnInit() {
    this.formGeneral.patchValue({
      ...this.data,
      tag: this.tags[0],
      restart: this.restartOptions[0]
    })
    /*
    if(this.data.entrypoint) {
      this.formGeneral.patchValue({
        entrypoint: Array.isArray(this.data.entrypoint) ? this.preFormating(this.data.entrypoint.join()) : this.preFormating(this.data.entrypoint)
      })
    }
    if(this.data.command) {
      this.formGeneral.patchValue({
        command: Array.isArray(this.data.command) ? this.preFormating(this.data.command.join()) : this.preFormating(this.data.command)
      })
    }
    */
    this.getTags()
  }

  getTags(): void {
    this.isLoading = true
    this.rest
      .getRepoTags(this.formGeneral.get('image').value, this.nextTagPage)
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe(({ results, next }) => {
        next ? this.nextTagPage++ : (this.nextTagPage = null)

        results.forEach(({ name }) => {
          const index = this.tags.findIndex((prevName) => name === prevName)
          index === -1 ? this.tags.push(name) : ''
        })

        this.isLoading = false
      })
  }

  closeModal(): void {
    this.dialogRef.close()
  }

  private preFormating(str) {
    //return str.split('').map((char, index, arr) => char === ',' && arr[index + 1] && arr[index + 1] != '\n' ? ',\n' : char).join('')
    return str
  }

  formatValue({ target }, formControlName) {
    const str = this.preFormating(target.value)
    let patchValue = {}
    patchValue[formControlName] = str
    this.formGeneral.patchValue({
      ...patchValue
    })
  }

  onSave(): void {
    const volumes = []
    const ports = []
    const environment = this.envVars.getKeyValuePaies()
    const labels = this.labels.getKeyValuePaies()

    this.currentPortSets.forEach((port) => {
      if (port.published.valid && port.target.valid && port.protocol.valid) {
        ports.push({
          published: port.published.value,
          target: port.target.value,
          protocol: port.protocol.value,
          mode: port.mode.value,
        })
      }
    })

    this.currentVolumeSets.forEach((volume) => {
      if (volume.selected && volume.formDestination.valid) {
        volumes.push({
          volume: volume.selected,
          destination: volume.formDestination.value,
        })
      }

      if (volume.relativePathSource.value && volume.formDestination.valid) {
        volumes.push({
          relativePathSource: volume.relativePathSource.value,
          destination: volume.formDestination.value,
        })
      }
    })

    let fields = this.formGeneral.getRawValue()

    //fields.command = fields.command.split('').map(char => char == '\n' ? char.replace('\n', '') : char).join('')
    //fields.entrypoint = fields.entrypoint.split('').map(char => char == '\n' ? char.replace('\n', '') : char).join('')

    Object.keys(fields).forEach((key) => {
      !fields[key] ? delete fields[key] : ''
    })

    this.store.dispatch(
      ProjectActions.UpdateService({
        data: {
          ...this.data,
          ...fields,
          volumes,
          ports,
          environment,
          labels,
        },
      }),
    )

    this.eventEmitterService.broadcast('change:connections', { source: this.data.uuid, targets: this.formGeneral.get('depends_on').value })

    this.checkCircle.showCircle()
    this.eventEmitterService.broadcast('save:project', {})
  }

  onRemovePort(index: number) {
    this.currentPortSets.splice(index, 1)
  }

  onAddPort() {
    this.currentPortSets.push({
      target: new FormControl('80'),
      published: new FormControl('8080'),
      protocol: new FormControl(this.protocols[0]),
      mode: new FormControl(this.modes[0]),
    })
  }

  onAddVolume() {
    this.currentVolumeSets.push({
      selected: null,
      relativePathSource: new FormControl(),
      formDestination: new FormControl(),
    })
  }

  onRemoveVolume(index: number) {
    this.currentVolumeSets.splice(index, 1)
  }

  serviceNameAlreadyExistsValidator = (control: AbstractControl): { [key: string]: boolean } | null => {
    const theSameNameOfService = this.otherImagesInCurrentProject.find(({ name }) => name === control.value)
    if (theSameNameOfService) {
      return { nameAlreadyExists: true }
    }
    return null
  }

  ngOnDestroy() {
    this.unSubscribe$.next(true)
    this.unSubscribe$.complete()
  }
}
