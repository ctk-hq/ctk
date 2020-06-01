import { Component, OnInit } from '@angular/core'

@Component({
  selector: 'check-circle',
  templateUrl: './check-circle.component.html',
  styleUrls: ['./check-circle.component.scss'],
})
export class CheckCircleComponent implements OnInit {
  visible: boolean = false
  constructor() {}

  ngOnInit(): void {}

  showCircle() {
    this.visible = true
    setTimeout(() => this.visible = false, 2000)
  }
}
