import { Component, OnInit, Input, EventEmitter, Output, OnDestroy, HostListener } from '@angular/core'
import { Router } from '@angular/router'
import { AppState } from './../../../app.state'
import { Store } from '@ngrx/store'
import * as ProjectActions from './../../store/project.actions'
import { AuthenticationService } from '../../services/authentication.service'
import { MatDialog } from '@angular/material/dialog'
import { ManageUserDialogComponent } from '../dialogs/manage-user-dialog/manage-user-dialog.component'

interface sideBarToogleEvent {
  name: string
}

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss'],
})
export class SideBarComponent implements OnInit {
  @Input() currentOpenedSideNavItem: string
  @Input() sidebarStatus: boolean
  @Output() toogleSideBarItem: EventEmitter<sideBarToogleEvent> = new EventEmitter()

  screenWidth: number
  userInitials: string

  constructor(private router: Router, private store: Store<AppState>, private authenticationService: AuthenticationService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.screenWidth = window.innerWidth
    this.authenticationService.currentUser.subscribe((user) => {
      if (user) {
        const {first_name, last_name, email} = user
        if(first_name && last_name) {
          this.userInitials = first_name[0] + last_name[0]
        } else {
          this.userInitials = email[0] + email[1]
        }
      }
    })
  }

  onClickLogo() {
    this.store.dispatch(ProjectActions.SetInitialState())

    if (this.screenWidth > 600) {
      this.router.navigate(['/'])
    } else {
      this.sidebarStatus = false
      this.toogleSideBarItem.emit({name: null})
    } 
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.screenWidth = window.innerWidth
  }

  handelClick() {
    const currentUser = this.authenticationService.currentUserValue
    if(currentUser) {
      this.dialog.open(ManageUserDialogComponent, {
        width: '20%',
        minWidth: '340px',
        position: {
          left: '70px',
          bottom: '70px'
        },
        data: currentUser
      })
    } else {
      this.router.navigate(['/auth/login/'])
    }
  }
}
