import { ComponentFactoryResolver, Injectable, ComponentFactory } from '@angular/core'
import { jsPlumb, Connection } from 'jsplumb'

import { NodeComponent } from './node/node.component'
import { IPosition } from 'src/app/core/store/models'
import { Store } from '@ngrx/store'
import { EventEmitterService } from 'src/app/core/services/event-emitter.service'

@Injectable()
export class NodeService {
  private rootViewContainer: any

  jsPlumbInstance

  constructor(private factoryResolver: ComponentFactoryResolver, public eventEmitter: EventEmitterService) {}

  public setRootViewContainerRef(viewContainerRef, jsplumbInstance) {
    this.jsPlumbInstance = jsplumbInstance

    this.rootViewContainer = viewContainerRef

    const eventEmitter = this.eventEmitter
    this.jsPlumbInstance.bind('dblclick', function (connection, event) {
      this.deleteConnection(connection)
      eventEmitter.broadcast('remove:depends_on', { source: connection.sourceId, target: connection.targetId })
    })
    this.jsPlumbInstance.bind('connectionDetached', (connection, event) => {
      if (event) eventEmitter.broadcast('remove:depends_on', { source: connection.sourceId, target: connection.targetId })
    })
    this.jsPlumbInstance.bind('connection', (connection, event) => {
      if (event && connection.sourceId !== connection.targetId)
        this.eventEmitter.broadcast('add:depends_on', { source: connection.sourceId, target: connection.targetId })
    })
  }

  public addDynamicNode(node: IPosition) {
    const factory = this.factoryResolver.resolveComponentFactory(NodeComponent)
    const component = factory.create(this.rootViewContainer.parentInjector)
    ;(<any>component.instance).node = node
    ;(<any>component.instance).jsPlumbInstance = this.jsPlumbInstance
    this.rootViewContainer.insert(component.hostView)
  }

  public addConnection(source, target) {
    this.jsPlumbInstance.connect({ uuids: [source + '_bottom', target + '_top'] })
  }

  public removeConnections(source) {
    const connections = []
    this.jsPlumbInstance.getAllConnections().forEach((con) => {
      if (con.sourceId === source) connections.push(con)
    })
    connections.forEach((con) => this.jsPlumbInstance.deleteConnection(con))
  }

  public getData() {
    const nodeList = document.querySelectorAll('.node')

    let result: IPosition[] = []
    nodeList.forEach((node: HTMLElement) => {
      result.push({
        uuid: node.id,
        top: node.offsetTop,
        left: node.offsetLeft,
        zoomLevel: this.jsPlumbInstance.getZoom(),
      })
    })
    return result
  }

  public removeNode(uuid: string) {
    const nodeList = document.querySelectorAll('.node')

    nodeList.forEach((node) => {
      if (node.id === uuid) {
        this.jsPlumbInstance.remove(uuid)
      }
    })
  }

  public updateNodesPosition(offset: { top: number; left: number }) {
    const nodeList = document.querySelectorAll('.node')

    nodeList.forEach((node: HTMLElement) => {
      node.style.left = `${node.offsetLeft + offset.left}px`
      node.style.top = `${node.offsetTop + offset.top}px`
      this.jsPlumbInstance.revalidate(node)
    })
  }

  public setZoom(zoomLevel: number) {
    this.jsPlumbInstance.setZoom(zoomLevel, true)
  }

  public clear() {
    const nodeList = document.querySelectorAll('.node')
    const points = document.querySelectorAll('.jtk-endpoint')
    points.forEach((node) => node.remove())
    nodeList.forEach((node) => {
      this.jsPlumbInstance.remove(node.id)
      node.remove()
    })
    this.rootViewContainer.clear()
  }
}
