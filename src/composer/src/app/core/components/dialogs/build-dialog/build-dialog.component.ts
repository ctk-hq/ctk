import { Component, OnInit, ViewChild, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { FormControl, Validators, FormGroup, FormBuilder, AbstractControl } from '@angular/forms'
import { KeyValueComponent } from '../../common/key-value/key-value/key-value.component'
import { Service, Project, Volume, ServicePort, Network } from '../../../store/models'
import { CheckCircleComponent } from '../../widgets/check-circle/check-circle.component'

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
  constructor(public dialogRef: MatDialogRef<BuildDialogComponent>, private formBuilder: FormBuilder, @Inject(MAT_DIALOG_DATA) public data: Service) { }

  ngOnInit(): void {
    this.formGeneral = this.formBuilder.group({
      build: new FormControl(''),
      context: new FormControl(''),
      dockerfile: new FormControl(''),
      network: new FormControl(''),
      shm_size: new FormControl(''),
      target: new FormControl(''),
    })
  }

  onSave() {
    const fields = {
      ...this.formGeneral.getRawValue(),
      args: this.args.getKeyValuePaies(),
      cache_from: this.cache_from.getKeyValuePaies(),
      labels: this.labels.getKeyValuePaies()
    }
    this.checkCircle.showCircle()
    console.log(fields)
  }

}
