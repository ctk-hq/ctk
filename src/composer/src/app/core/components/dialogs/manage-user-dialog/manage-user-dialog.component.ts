import { Component, OnInit, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { User } from '../../../store/models'
import { AuthenticationService } from '../../../services/authentication.service'

@Component({
  selector: 'app-manage-user-dialog',
  templateUrl: './manage-user-dialog.component.html',
  styleUrls: ['./manage-user-dialog.component.scss']
})
export class ManageUserDialogComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<ManageUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User,
    public authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
  }


  logout() {
    this.authenticationService.removeUser()
    this.dialogRef.close()
    location.href = '/'
  }
}
