import { Component, OnInit, ViewChild, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { FormControl, Validators, FormGroup, FormBuilder, AbstractControl } from '@angular/forms'
import { KeyValueComponent } from '../../common/key-value/key-value/key-value.component'
import { Service, ServiceDeploy, KeyValuePair } from '../../../store/models'
import { CheckCircleComponent } from '../../widgets/check-circle/check-circle.component'
import { Store } from '@ngrx/store'
import * as ProjectActions from './../../../store/project.actions'
import { EventEmitterService } from 'src/app/core/services/event-emitter.service'

@Component({
  selector: 'app-deploy-dialog',
  templateUrl: './deploy-dialog.component.html',
  styleUrls: ['./deploy-dialog.component.scss']
})
export class DeployDialogComponent implements OnInit {
  @ViewChild(CheckCircleComponent) checkCircle: CheckCircleComponent
  @ViewChild('preferences') preferences: KeyValueComponent
  @ViewChild('labels') labels: KeyValueComponent

  formGeneral: FormGroup
  currentPreferences: KeyValuePair[] = []
  currentLabels: KeyValuePair[] = []
  constructor(public dialogRef: MatDialogRef<DeployDialogComponent>, private formBuilder: FormBuilder, @Inject(MAT_DIALOG_DATA) public data: Service, private store: Store, private eventEmitterService: EventEmitterService,) { }

  ngOnInit(): void {
    this.formGeneral = this.formBuilder.group({
      mode: new FormControl(''),
      replicas: new FormControl(''),
      update_config: this.formBuilder.group({
          parallelism:  new FormControl('', [Validators.pattern('^[0-9]+$')]),
          delay: new FormControl(''),
          order: new FormControl('')
      }),
      rollback_config: new FormControl(''),
      restart_policy: this.formBuilder.group({
        condition: new FormControl(''),
        delay: new FormControl(''),
        parallelism:  new FormControl('', [Validators.pattern('^[0-9]+$')]),
        window: new FormControl(''),
      }),
      endpoint_mode: new FormControl(''),
      placement: this.formBuilder.group({
        constraints: new FormControl(''),
        max_replicas_per_node:  new FormControl('', [Validators.pattern('^[0-9]+$')])
      }),
      resources: this.formBuilder.group({
        limits: this.formBuilder.group({
          cpus: new FormControl(''),
          memory: new FormControl('')
        }),
        reservations: this.formBuilder.group({
          cpus: new FormControl(''),
          memory: new FormControl('')
        })
      })
    })
    
    if(this.data.deploy) {
      this.data.deploy.labels.forEach(val => this.currentLabels.push(val))
      this.data.deploy.placement.preferences.forEach(val => this.currentPreferences.push(val))

      this.formGeneral.patchValue({
        ...this.data.deploy,
        placement: {
          max_replicas_per_node: this.data.deploy.placement.max_replicas_per_node,
          constraints: this.data.deploy.placement.constraints.join(',')
        }
      })
    }
  }

  onSave(): void {
    const fields: ServiceDeploy = {
      ...this.formGeneral.getRawValue(),
      placement: {
        max_replicas_per_node: this.formGeneral.get('placement').value.max_replicas_per_node,
        constraints: this.formGeneral.get('placement').value.constraints.split(','),
        preferences: this.preferences.getKeyValuePaies()
      },
      labels: this.labels.getKeyValuePaies(),
    }

    this.store.dispatch(ProjectActions.UpdateService({data: {...this.data, deploy: fields}}))
    this.checkCircle.showCircle()
    this.eventEmitterService.broadcast('save:project', {})
  }

  closeModal(): void {
    this.dialogRef.close()
  }

}
