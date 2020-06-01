import { Component, OnInit, Inject, ViewChild, OnDestroy } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog'
import { Volume, Project } from 'src/app/core/store/models'
import { Observable, Subject } from 'rxjs'
import { Store } from '@ngrx/store'
import { AppState } from 'src/app/app.state'
import { FormControl, Validators, FormGroup, FormBuilder } from '@angular/forms'
import * as ProjectActions from './../../../store/project.actions'
import { uuidv4 } from 'src/app/core/utils/utils'
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component'
import { CheckCircleComponent } from '../../widgets/check-circle/check-circle.component'
import { KeyValueComponent } from '../../common/key-value/key-value/key-value.component'
import { EventEmitterService } from '../../../services/event-emitter.service'
import { takeUntil } from 'rxjs/operators'

@Component({
  selector: 'app-manage-volumes-dialog',
  templateUrl: './manage-volumes-dialog.component.html',
  styleUrls: ['./manage-volumes-dialog.component.scss'],
})
export class ManageVolumesDialogComponent implements OnInit, OnDestroy {
  @ViewChild(CheckCircleComponent) checkCircle: CheckCircleComponent
  @ViewChild('labels') labels: KeyValueComponent
  project: Observable<Project>
  volumes: Volume[]
  formGeneral: FormGroup
  selectedVolume: Volume
  creatingNew: boolean = true

  private unSubscribe$ = new Subject()

  constructor(
    private store: Store<AppState>,
    public dialogRef: MatDialogRef<ManageVolumesDialogComponent>,
    private formBuilder: FormBuilder,
    public dialog: MatDialog,
    private eventEmitterService: EventEmitterService,
  ) {
    this.project = this.store.select('project')

    this.project.pipe(takeUntil(this.unSubscribe$)).subscribe((v) => {
      this.volumes = v.volumes
      this.selectedVolume = this.selectedVolume ? this.volumes.find(({ uuid }) => uuid === this.selectedVolume.uuid) : null
    })

    this.formGeneral = this.formBuilder.group({
      name: new FormControl('', Validators.required),
      volume_name: new FormControl(''),
      driver: 'local',
      external: false,
      external_name: '',
    })

    const external_name = this.formGeneral.get('external_name')

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

  ngOnInit(): void {
    //console.log(this.volumes)
  }

  closeModal(): void {
    this.dialogRef.close()
  }

  onNew() {
    this.formGeneral.setValue({
      name: '',
      volume_name: '',
      driver: 'local',
      external: false,
      external_name: '',
    })
    this.selectedVolume = null
    this.creatingNew = true
  }

  onChange() {
    if (!this.selectedVolume) return
    this.creatingNew = false
    this.formGeneral.patchValue({
      name: this.selectedVolume.name,
      volume_name: this.selectedVolume.volume_name,
      driver: this.selectedVolume.driver,
      external: this.selectedVolume.external,
      external_name: this.selectedVolume.external ? this.selectedVolume.external_name : '',
    })
  }

  onDelete() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm delete',
        content: 'Are you sure want to delete this volume?',
      },
    })

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe((result: true) => {
        if (result == true) {
          this.store.dispatch(ProjectActions.RemoveVolume({ data: this.selectedVolume }))
          this.formGeneral.setValue({
            name: '',
            volume_name: '',
            driver: 'local',
            external: false,
            external_name: '',
          })
          this.selectedVolume = null
          this.creatingNew = true
          this.eventEmitterService.broadcast('save:project', {})
        }
      })
  }

  onCreate() {
    const labels = this.labels.getKeyValuePaies()
    const volume = {
      uuid: uuidv4(),
      name: this.formGeneral.get('name').value,
      volume_name: this.formGeneral.get('volume_name').value,
      driver: this.formGeneral.get('driver').value,
      external: this.formGeneral.get('external').value,
      external_name: this.formGeneral.get('external').value ? this.formGeneral.get('external_name').value : null,
      driver_opts: null,
      labels: labels,
    }
    this.store.dispatch(
      ProjectActions.CreateVolume({
        data: volume,
      }),
    )
    this.selectedVolume = volume
    this.creatingNew = false
    this.checkCircle.showCircle()
    this.eventEmitterService.broadcast('save:project', {})
  }

  onUpdate() {
    const labels = this.labels.getKeyValuePaies()
    this.selectedVolume = {
      ...this.selectedVolume,
      name: this.formGeneral.get('name').value,
      volume_name: this.formGeneral.get('volume_name').value,
      driver: this.formGeneral.get('driver').value,
      external: this.formGeneral.get('external').value,
      external_name: this.formGeneral.get('external').value ? this.formGeneral.get('external_name').value : null,
      labels: labels,
    }
    this.store.dispatch(ProjectActions.UpdateVolume({ data: this.selectedVolume }))
    this.checkCircle.showCircle()
    this.eventEmitterService.broadcast('save:project', {})
  }

  ngOnDestroy() {
    this.unSubscribe$.next(true)
    this.unSubscribe$.complete()
  }
}
