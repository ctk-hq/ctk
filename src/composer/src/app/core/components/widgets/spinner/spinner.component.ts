import { Component, OnInit } from '@angular/core'
import { Store } from '@ngrx/store'
import { AppState } from '../../../../app.state'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'


@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
})
export class SpinnerComponent implements OnInit {

  private unSubscribe$ = new Subject()
  showGlobalSpinner: boolean = true
  
  constructor(private store: Store<AppState>) {
    this.store.select('globalSpinnerState').pipe(takeUntil(this.unSubscribe$)).subscribe((value) => (this.showGlobalSpinner = value))
  }

  ngOnInit(): void {}
}
