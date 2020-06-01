import { Component, OnInit, Inject, EventEmitter } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { User } from '../../../store/models'
import { AuthenticationService } from '../../../services/authentication.service'
import { first } from 'rxjs/operators'

@Component({
  selector: 'app-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss']
})
export class ImportDialogComponent implements OnInit {
  onImport = new EventEmitter<string>();
  importUrl: string
  constructor(public dialogRef: MatDialogRef<ImportDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: { importUrl: string }) {
    if (this.data.importUrl) {
      this.importUrl = this.data.importUrl
    }
  }

  ngOnInit(): void {
  }

  import(): void {
    this.onImport.emit(this.importUrl)
    this.dialogRef.close()
  }
}
