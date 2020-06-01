import { Component, OnInit, Inject, HostListener, OnDestroy, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Store } from '@ngrx/store'
import { AppState } from './../../../app.state'
import * as ProjectActions from './../../store/project.actions'
import * as GlobalDialogActions from './../../store/actions/global-dialog.actions'
import { EventEmitterService } from '../../services/event-emitter.service'
import * as GlobalSpinnerActions from './../../store/actions/global-spinner.actions'
import { MatDrawer } from '@angular/material/sidenav'
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { GlobalDialogComponent } from '../dialogs/global-dialog/global-dialog.component'
import { Subject } from 'rxjs'
import { takeUntil, skip } from 'rxjs/operators'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('sideNav') sideNav: MatDrawer
  currentOpenedSideNavItem: string = null
  showFiller = false
  screenWidth: number
  showSidebar: boolean = true
  showCloseButton: boolean = false

  private unSubscribe$ = new Subject()

  constructor(private route: ActivatedRoute, private store: Store<AppState>, private eventEmitter: EventEmitterService, public dialog: MatDialog, private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    this.screenWidth = window.innerWidth
    if (this.screenWidth < 600) {
      this.showSidebar = false
    }

    const uuid = this.route.snapshot.params['uuid']
    if (uuid) {
      this.store.dispatch(GlobalSpinnerActions.OnSpinner())
      this.store.dispatch(ProjectActions.UploadProject({ data: uuid }))
      this.eventEmitter.broadcast('initialize:node', {})
    }

    const recipe = this.activatedRoute.snapshot.queryParams['recipe']
    if (recipe) {
      this.store.dispatch(ProjectActions.ViewRecipe({ data: recipe }))
    }

    this.store.select('globalError').pipe(takeUntil(this.unSubscribe$), skip(1)).subscribe((body) => {
      if (body.type) {
        this.store.dispatch(GlobalSpinnerActions.OffSpinner())
        const dialogRef = this.dialog.open(GlobalDialogComponent, {
          width: '800px',
          data: body,
        })
        if (body.type === GlobalDialogActions.PROJECT_NOT_FOUND) {
          dialogRef
            .afterClosed()
            .pipe(takeUntil(this.unSubscribe$))
            .subscribe(() => {
              this.store.dispatch(ProjectActions.SetInitialState())
              this.router.navigate(['/', ''])
            })
        }
      }
    })
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.screenWidth = window.innerWidth
  }

  ngOnDestroy() {
    this.unSubscribe$.next(true);
    this.unSubscribe$.complete();
  }

  openSideBarItem(event) {
    if(event.name === null) {
      this.sideNav.close()
      this.showCloseButton = false
      setTimeout(() => {
        this.currentOpenedSideNavItem = null
        }, 300)
    }
    else if(event.name === this.currentOpenedSideNavItem) {
      this.sideNav.close()
      this.showCloseButton = false
      setTimeout(() => {
        this.currentOpenedSideNavItem = null
        }, 300)
    } else {
      this.currentOpenedSideNavItem = event.name
      if(!this.sideNav.opened) {
        this.sideNav.open()
        this.showCloseButton = true
      }
    }
  }
}
