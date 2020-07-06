import { Component } from '@angular/core';
import { AuthGuard } from './core/helpers/auth.gourd'
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Compose';
  constructor(private authGuard: AuthGuard) {}
}
