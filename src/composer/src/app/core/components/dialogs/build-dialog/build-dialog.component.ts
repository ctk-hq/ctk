import { Component, OnInit, ViewChild, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { FormControl, Validators, FormGroup, FormBuilder, AbstractControl } from '@angular/forms'
import { KeyValueComponent } from '../../common/key-value/key-value/key-value.component'
import { Service, Project, Volume, ServicePort, Network } from '../../../store/models'
import { CheckCircleComponent } from '../../widgets/check-circle/check-circle.component'
import { Store } from '@ngrx/store'
import * as ProjectActions from './../../../store/project.actions'
import { EventEmitterService } from 'src/app/core/services/event-emitter.service'

@Component({
  selector: 'app-build-dialog',
  templateUrl: './build-dialog.component.html',
  styleUrls: ['./build-dialog.component.scss']
})
export class BuildDialogComponent implements OnInit {
  @ViewChild(CheckCircleComponent) checkCircle: CheckCircleComponent
  @ViewChild('args') args: KeyValueComponent
  @ViewChild('cache_from') cache_from: KeyValueComponent
  @ViewChild('labels') labels: KeyValueComponent

  formGeneral: FormGroup
  currentArgs: [] = []
  currentCacheFrom: [] = []
  currentLabels: [] = []
  constructor(public dialogRef: MatDialogRef<BuildDialogComponent>, private formBuilder: FormBuilder, @Inject(MAT_DIALOG_DATA) public data: Service, private store: Store, private eventEmitterService: EventEmitterService,) { }

  ngOnInit(): void {
    this.formGeneral = this.formBuilder.group({
      build: new FormControl(''),
      context: new FormControl(''),
      dockerfile: new FormControl(''),
      network: new FormControl(''),
      shm_size: new FormControl(''),
      target: new FormControl(''),
    })

    if (this.data.build) {
      this.data.build.labels.forEach(val => this.currentLabels.push(val))
      this.data.build.cache_from.forEach(val => this.currentCacheFrom.push(val))
      this.data.build.args.forEach(val => this.currentArgs.push(val))

      let fields = Object.keys(this.data.build).reduce((acc, key) => {
        if(this.data.build[key]) acc[key] = this.data.build[key]
        return acc
      }, {})
  
      this.formGeneral.patchValue(fields)
    }
  }

  onSave() {
    const fields = {
      ...this.formGeneral.getRawValue(),
      args: this.args.getKeyValuePaies(),
      cache_from: this.cache_from.getKeyValuePaies(),
      labels: this.labels.getKeyValuePaies()
    }
    this.store.dispatch(ProjectActions.UpdateService({data: {...this.data, build: fields}}))
    this.checkCircle.showCircle()
    this.eventEmitterService.broadcast('save:project', {})
  }

  closeModal(): void {
    this.dialogRef.close()
  }
}
