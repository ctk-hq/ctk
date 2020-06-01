import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthenticationService } from '../core/services/authentication.service'
import { first } from 'rxjs/operators'

@Component({
  selector: 'app-callback',
  templateUrl: './callback.component.html',
  styleUrls: ['./callback.component.scss']
})
export class CallbackComponent implements OnInit {

  constructor(private activetedRoute: ActivatedRoute, private router: Router, private authenticationService: AuthenticationService) { }

  ngOnInit(): void {  
    const code = this.activetedRoute.snapshot.queryParams['code']
    if (code) {
      this.authenticationService.gitHubLogin(code)
      .pipe(first())
      .subscribe(
        data => {
          const lastPageBeferoLogin = localStorage.getItem('lastPageBeforeRegistrationOrLogin')
          lastPageBeferoLogin ? this.router.navigate([lastPageBeferoLogin]) : this.router.navigate(['/'])
        });
    } else {
      const lastPageBeferoLogin = localStorage.getItem('lastPageBeforeRegistrationOrLogin')
      lastPageBeferoLogin ? this.router.navigate([lastPageBeferoLogin]) : this.router.navigate(['/'])
    }
  }

}
