import { Component, OnInit, Inject, ViewChild, OnDestroy } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog'
import { Project, Network, KeyValuePair } from 'src/app/core/store/models'
import { Observable, Subject } from 'rxjs'
import { Store } from '@ngrx/store'
import { AppState } from 'src/app/app.state'
import { FormControl, Validators, FormGroup, FormBuilder } from '@angular/forms'
import * as ProjectActions from '../../../store/project.actions'
import { uuidv4 } from 'src/app/core/utils/utils'
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component'
import { CheckCircleComponent } from '../../widgets/check-circle/check-circle.component'
import { KeyValueComponent } from '../../common/key-value/key-value/key-value.component'
import { EventEmitterService } from '../../../services/event-emitter.service'
import { takeUntil } from 'rxjs/operators'

@Component({
  selector: 'manage-networks-dialog',
  templateUrl: './manage-networks-dialog.component.html',
  styleUrls: ['./manage-networks-dialog.component.scss'],
})
export class ManageNetworksDialogComponent implements OnInit, OnDestroy {
  @ViewChild(CheckCircleComponent) checkCircle: CheckCircleComponent
  @ViewChild(KeyValueComponent) driverOptsPairs: KeyValueComponent
  @ViewChild('labels') labels :KeyValueComponent
  project: Observable<Project>
  networks: Network[]
  formGeneral: FormGroup
  selectedNetwork: Network
  creatingNew: boolean = true
  driverOptions: string[] = ['bridge', 'host', 'overlay', 'macvlan', 'none', 'custom']
  driverOpts: KeyValuePair[]

  private unSubscribe$ = new Subject()

  constructor(
    private store: Store<AppState>,
    public dialogRef: MatDialogRef<ManageNetworksDialogComponent>,
    private formBuilder: FormBuilder,
    public dialog: MatDialog,
    private eventEmitterService: EventEmitterService,
  ) {}

  ngOnInit(): void {
    this.project = this.store.select('project')

    this.project.pipe(takeUntil(this.unSubscribe$)).subscribe((n) => {
      this.networks = n.networks
      this.selectedNetwork = this.selectedNetwork ? this.networks.find(({ uuid }) => uuid === this.selectedNetwork.uuid) : null
    })

    this.formGeneral = this.formBuilder.group({
      name: new FormControl('', Validators.required),
      object_name: new FormControl(''),
      driver: this.driverOptions[0],
      custom_driver: new FormControl(''),
      external: false,
      external_name: new FormControl(''),
    })

    const custom_driver = this.formGeneral.get('custom_driver')
    const external_name = this.formGeneral.get('external_name')

    this.formGeneral
      .get('driver')
      .valueChanges.pipe(takeUntil(this.unSubscribe$))
      .subscribe((driver) => {
        if (driver === 'custom') {
          custom_driver.setValidators([Validators.required])
        } else {
          custom_driver.setValidators(null)
        }
        custom_driver.updateValueAndValidity()
      })

    this.formGeneral
      .get('external')
      .valueChanges.pipe(takeUntil(this.unSubscribe$))
      .subscribe((external) => {
        if (external) {
          external_name.setValidators([Validators.required])
        } else {
          external_name.setValidators(null)
        }
        external_name.updateValueAndValidity()
      })
  }

  closeModal(): void {
    this.dialogRef.close()
  }

  onCreate() {
    const labels = this.labels.getKeyValuePaies()
    const driver_opts = this.driverOptsPairs.getKeyValuePaies()
    const driver = this.formGeneral.get('driver').value === 'custom' ? this.formGeneral.get('custom_driver').value : this.formGeneral.get('driver').value
    const driver_custom = this.formGeneral.get('driver').value === 'custom' ? true : false
    const network = {
      uuid: uuidv4(),
      name: this.formGeneral.get('name').value,
      object_name: this.formGeneral.get('object_name').value,
      driver: driver,
      driver_custom: driver_custom,
      driver_opts: driver_opts,
      labels: labels,
      external: this.formGeneral.get('external').value,
      external_name: this.formGeneral.get('external').value ? this.formGeneral.get('external_name').value : null,
      type: null,
      attachable: null,
      enable_ipv6: null,
      ipam: null,
      internal: null,
    }
    this.store.dispatch(
      ProjectActions.CreateNetwork({
        data: network,
      }),
    )
    this.selectedNetwork = network
    this.creatingNew = false
    this.checkCircle.showCircle()
    this.eventEmitterService.broadcast('save:project', {})
  }

  onDelete() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm delete',
        content: 'Are you sure want to delete this network?',
      },
    })

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe((result: true) => {
        if (result == true) {
          this.store.dispatch(ProjectActions.RemoveNetwork({ data: this.selectedNetwork }))
          this._setupDefault()
          this.eventEmitterService.broadcast('save:project', {})
        }
      })
  }

  onUpdate() {
    const labels = this.labels.getKeyValuePaies()
    const driver_opts = this.driverOptsPairs.getKeyValuePaies()
    const driver = this.formGeneral.get('driver').value === 'custom' ? this.formGeneral.get('custom_driver').value : this.formGeneral.get('driver').value
    const driver_custom = this.formGeneral.get('driver').value === 'custom' ? true : false

    this.selectedNetwork = {
      ...this.selectedNetwork,
      name: this.formGeneral.get('name').value,
      object_name: this.formGeneral.get('object_name').value,
      external: this.formGeneral.get('external').value,
      external_name: this.formGeneral.get('external').value ? this.formGeneral.get('external_name').value : null,
      driver,
      driver_custom,
      driver_opts,
      labels: labels
    }

    this.store.dispatch(ProjectActions.UpdateNetwork({ data: this.selectedNetwork }))
    this.checkCircle.showCircle()
    this.eventEmitterService.broadcast('save:project', {})
  }

  onChange() {
    if (!this.networks) return
    this.driverOpts = this.selectedNetwork.driver_opts.map((pair: KeyValuePair) => {
      return { key: pair.key, value: pair.value }
    })
    this.creatingNew = false
    const isCustomDriver = this.driverOptions.find((driver) => driver === this.selectedNetwork.driver)
    if (isCustomDriver && isCustomDriver !== 'custom') {
      const fields = Object.keys(this.formGeneral.value).reduce((acc, feild) => {
        acc[feild] = this.selectedNetwork[feild]
        return acc
      }, {})
      this.formGeneral.setValue({
        ...fields,
        custom_driver: '',
      })
    } else {
      const fields = Object.keys(this.formGeneral.value).reduce((acc, feild) => {
        acc[feild] = this.selectedNetwork[feild]
        return acc
      }, {})

      this.formGeneral.setValue({
        ...fields,
        driver: 'custom',
        custom_driver: this.selectedNetwork.driver,
      })
    }
  }

  _setupDefault() {
    this.formGeneral.patchValue({
      name: '',
      object_name: '',
      driver: this.driverOptions[0],
      custom_driver: '',
      external: false,
      external_name: '',
    })
    this.selectedNetwork = null
    this.creatingNew = true
    this.driverOpts = []
  }

  ngOnDestroy() {
    this.unSubscribe$.next(true)
    this.unSubscribe$.complete()
  }
}
