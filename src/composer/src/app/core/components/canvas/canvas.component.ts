import { Observable } from 'rxjs/Observable'
import { Store } from '@ngrx/store'
import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef, AfterViewInit, ElementRef } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { AppState } from './../../../app.state'
import { Project, Service, IPosition, Volume } from './../../store/models'
import { ManageVolumesDialogComponent } from '../dialogs/manage-volumes-dialog/manage-volumes-dialog.component'
import { ManageNetworksDialogComponent } from '../dialogs/manage-networks-dialog/manage-networks-dialog.component'
import { jsPlumb } from 'jsplumb'
import { EventEmitterService } from '../../services/event-emitter.service'
import { NodeService } from './jsplumb/node.service'
import * as ProjectActions from './../../store/project.actions'
import * as GlobalSpinnerActions from './../../store/actions/global-spinner.actions'

import panzoom from 'panzoom'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('nodeContainer') nodeContainer: ElementRef;
  project: Observable<Project>
  services: Service[]
  positions: IPosition[]
  volumes: Volume[]

  projectData = {}

  jsPlumbInstance
  nodes = []
  connections = []

  onFirstLoad = false
  prevPanState: any
  dragStatus = false
  zoomLevel = 1
  zoomLevelUnit = 0.065
  minZoomLevel = 0.5
  maxZoomLevel = 2
  containerSize = 3000

  private unSubscribe$ = new Subject()

  private unSubscribeEventService: Function

  @ViewChild('nodes', { read: ViewContainerRef, static: true }) viewContainerRef: ViewContainerRef

  constructor(
    private store: Store<AppState>,
    private dialog: MatDialog,
    private eventEmitterService: EventEmitterService,
    private nodeService: NodeService,
  ) {
    this.project = this.store.select('project')

    this.project.pipe(takeUntil(this.unSubscribe$)).subscribe((v) => {
      if(v.services && v.canvas && v.volumes) {
        this.services = v.services
        this.positions = v.canvas
        this.volumes = v.volumes

        if (this.onFirstLoad == true) {
          let zoomLevel = 1
          this.nodeService.clear()
          this.positions.forEach((p: IPosition) => {
            this.nodeService.addDynamicNode(p)
            p.zoomLevel ? (zoomLevel = p.zoomLevel) : (zoomLevel = 1)
          })
          setTimeout(() => {
            this.nodeContainer.nativeElement.click()
            this.services.forEach((s: Service) => {
              s.depends_on
                ? s.depends_on.forEach((uuid) => {
                    this.nodeService.addConnection(s.uuid, uuid)
                  })
                : null
            })

            this.zoomLevel = zoomLevel
            this.setZoom()
          })
          this.onFirstLoad = false
        }
        this.store.dispatch(GlobalSpinnerActions.OffSpinner())
      }
    })

    this.eventEmitterService.subscribe('remove:node', (uuid) => {
      this.nodeService.removeNode(uuid)
    })

    this.eventEmitterService.subscribe('change:connections', (data: { source: string; targets: Array<string> }) => {
      this.nodeService.removeConnections(data.source)
      data.targets
        ? data.targets.forEach((target) => {
            this.nodeService.addConnection(data.source, target)
          })
        : ''
    })

    this.eventEmitterService.subscribe('add:depends_on', (data: { source: any; target: any }) => {
      const service = this.services.find((s) => s.uuid === data.source)
      if (service.depends_on) {
        const currentTargetAlreadyExisted = service.depends_on.find((uuid) => uuid === data.target)
        if (!currentTargetAlreadyExisted) {
          this.store.dispatch(
            ProjectActions.UpdateService({
              data: {
                ...service,
                depends_on: [...service.depends_on, data.target],
              },
            }),
          )
        }
      } else {
        this.store.dispatch(
          ProjectActions.UpdateService({
            data: {
              ...service,
              depends_on: [data.target],
            },
          }),
        )
      }
    })

    this.eventEmitterService.subscribe('remove:depends_on', (data: { source: any; target: any }) => {
      const service = this.services.find((s) => s.uuid === data.source)
      const dependsOn = service.depends_on.filter((d) => d !== data.target)
      this.store.dispatch(
        ProjectActions.UpdateService({
          data: {
            ...service,
            depends_on: dependsOn,
          },
        }),
      )
    })

    this.unSubscribeEventService = this.eventEmitterService.subscribe('save:project', () => {
      const positionData = this.nodeService.getData()
      this.store.dispatch(ProjectActions.SetPositions({ data: positionData }))
      this.store.dispatch(ProjectActions.SaveProject())
    })

    this.eventEmitterService.subscribe('initialize:node', () => {
      this.onFirstLoad = true
    })
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.jsPlumbInstance = jsPlumb.getInstance()
    this.nodeService.setRootViewContainerRef(this.viewContainerRef, this.jsPlumbInstance)
  }

  onMouseDown(event) {
    this.dragStatus = true
    this.prevPanState = {
      x: event.x,
      y: event.y,
    }
  }

  onMouseMove(event) {
    if (!this.dragStatus) return
    this.nodeService.updateNodesPosition({
      left: event.x - this.prevPanState.x,
      top: event.y - this.prevPanState.y,
    })
    this.prevPanState = {
      x: event.x,
      y: event.y,
    }
  }

  onMouseUp() {
    this.dragStatus = false
  }

  onMouseWheel(event) {
    let zoom = event.wheelDelta > 0 ? this.zoomLevel - this.zoomLevelUnit : this.zoomLevel + this.zoomLevelUnit
    if (zoom > this.maxZoomLevel || zoom < this.minZoomLevel) return

    this.zoomLevel = zoom
    this.setZoom()
  }

  setZoom() {
    this.viewContainerRef.element.nativeElement.parentElement.style.transform = `scale(${this.zoomLevel})`
    this.viewContainerRef.element.nativeElement.parentElement.style.width = `${this.containerSize / this.zoomLevel}px`
    this.viewContainerRef.element.nativeElement.parentElement.style.height = `${this.containerSize / this.zoomLevel}px`
    this.viewContainerRef.element.nativeElement.parentElement.style.top = `${-(this.containerSize / this.zoomLevel - this.containerSize) / 2 - 100}px`
    this.viewContainerRef.element.nativeElement.parentElement.style.left = `${
      -(this.containerSize / this.zoomLevel - this.containerSize) / 2 - 100
    }px`
    this.nodeService.setZoom(this.zoomLevel)
  }

  manageProjectVolumes(): void {
    this.dialog.open(ManageVolumesDialogComponent, {
      width: '50%',
      minWidth: '640px',
      data: this.volumes,
    })
  }

  manageProjectSecrets(): void {
    //console.log('manageProjectSecrets')
  }

  manageProjectNetworks(): void {
    this.dialog.open(ManageNetworksDialogComponent, {
      width: '50%',
      minWidth: '640px',
    })
  }

  ngOnDestroy() {
    this.unSubscribeEventService()
    this.unSubscribe$.next(true)
    this.unSubscribe$.complete()
  }
}
