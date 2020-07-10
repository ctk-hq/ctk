import { Component, Input, AfterViewInit, OnDestroy } from '@angular/core'
import { IPosition, Service } from 'src/app/core/store/models'
import { Store } from '@ngrx/store'
import { AppState } from 'src/app/app.state'
import { RestService } from 'src/app/core/services/rest.service'
import { MatDialog } from '@angular/material/dialog'
import { ManageProjectDialogComponent } from '../../../dialogs/manage-project-dialog/manage-project-dialog.component'
import { ConfirmDialogComponent } from '../../../dialogs/confirm-dialog/confirm-dialog.component'
import { BuildDialogComponent } from '../../../dialogs/build-dialog/build-dialog.component'
import * as ProjectActions from './../../../../store/project.actions'
import { NodeService } from '../node.service'
import { EventEmitterService } from 'src/app/core/services/event-emitter.service'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

@Component({
  selector: 'node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.scss'],
})
export class NodeComponent implements AfterViewInit, OnDestroy {
  @Input() node: IPosition

  @Input() jsPlumbInstance

  services = []
  currentService: Service

  widthNode: number = 150
  heightNode: number = 150
  widthCanvasBorder: number = 15

  private unSubscribe$ = new Subject()

  constructor(private store: Store<AppState>, public rest: RestService, public dialog: MatDialog, private eventEmitterService: EventEmitterService) {
    const project = this.store.select('project')

    project.pipe(takeUntil(this.unSubscribe$)).subscribe((v) => {
      this.services = v.services

      setTimeout(() => {
        this.currentService = this.services.find((s: Service) => s.uuid === this.node.uuid)
      })
    })
  }

  ngAfterViewInit() {
    const exampleDropOptions = {
      tolerance: 'touch',
      hoverClass: 'dropHover',
      activeClass: 'dragActive',
    }
    let Endpoint1 = {
      endpoint: ['Dot', { radius: 7 }],
      paintStyle: { fill: '#99cb3a' },
      scope: 'jsPlumb_DefaultScope',
      connectorStyle: { stroke: '#99cb3a', strokeWidth: 2 },
      connector: ['Bezier', { curviness: 63 }],
      maxConnections: -1,
      isSource: true,
      isTarget: false,
      connectorOverlays: [['Arrow', { location: 1, width: 10, length: 10 }]],
      dropOptions: exampleDropOptions,
    }
    let Endpoint2 = {
      endpoint: ['Dot', { radius: 5 }],
      paintStyle: { fill: '#ffcb3a' },
      scope: 'jsPlumb_DefaultScope',
      maxConnections: -1,
      isSource: false,
      isTarget: true,
      dropOptions: exampleDropOptions,
    }
    const { uuid } = this.node

    this.jsPlumbInstance.addEndpoint(uuid, { anchor: 'Bottom', uuid: uuid + '_bottom' }, Endpoint1)
    this.jsPlumbInstance.addEndpoint(uuid, { anchor: 'Top', uuid: uuid + '_top' }, Endpoint2)
    this.jsPlumbInstance.draggable(uuid, {
      drag: ({ pos, el }) => {
        const { width, height } = el.parentElement.parentElement.getBoundingClientRect()
        const [left, top] = pos
        //left-top
        left < this.widthCanvasBorder ? (el.style.left = `${this.widthCanvasBorder}px`) : ''
        top < this.widthCanvasBorder ? (el.style.top = `${this.widthCanvasBorder}px`) : ''
        //left-top
        //right-bottom
        left + this.widthNode + this.widthCanvasBorder > width ? (el.style.left = `${width - this.heightNode - this.widthCanvasBorder}px`) : ''
        top + this.heightNode + this.widthCanvasBorder > height ? (el.style.top = `${height - this.heightNode - this.widthCanvasBorder}px`) : ''
        //right-bottom
      },
    })
  }

  manageProjectService(): void {
    const dialogRef = this.dialog.open(ManageProjectDialogComponent, {
      width: '50%',
      minWidth: '740px',
      data: this.currentService,
    })
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe((result: { data: Service }) => {
        if (result) {
          this.store.dispatch(ProjectActions.UpdateService({ data: result.data }))
        }
      })
  }

  removeService(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm delete',
        content: 'Are you sure want to delete this service?',
      },
    })

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe((result: boolean) => {
        if (result == true) {
          this.store.dispatch(ProjectActions.RemoveService({ data: this.currentService }))
          this.store.dispatch(ProjectActions.RemovePosition({ data: this.node }))
          this.eventEmitterService.broadcast('remove:node', this.currentService.uuid)
        }
      })
  }

  buildDialogOpen() {
    this.dialog.open(BuildDialogComponent, {
      width: '50%',
      minWidth: '740px',
      data: this.currentService,
    })
  }

  ngOnDestroy() {
    this.unSubscribe$.next(true)
    this.unSubscribe$.complete()
  }
}
