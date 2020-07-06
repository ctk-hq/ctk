import { Component, OnInit } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthenticationService } from '../core/services/authentication.service'
import { Location } from '@angular/common'
import { first } from 'rxjs/operators'
import { AuthGuard } from '../core/helpers/auth.gourd'
import { Store } from '@ngrx/store'
import * as GlobalSpinnerActions from '../core/store/actions/global-spinner.actions'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup
  errors: string[]
  constructor(private formBuilder: FormBuilder, public _location: Location, private router: Router, private authenticationService: AuthenticationService, private store: Store) {
    this.loginForm = this.formBuilder.group({
      email: new FormControl('', [ Validators.email ]),
      password: new FormControl('', [ Validators.minLength(3) ])
    })
  }

  ngOnInit(): void {
    this.store.dispatch(GlobalSpinnerActions.OffSpinner())
  }

  login(): void {
    this.authenticationService.login(this.loginForm.value)
    .pipe(first())
    .subscribe(
      data => {
        const lastPageBeferoLogin = localStorage.getItem('lastPageBeforeRegistrationOrLogin')
        lastPageBeferoLogin ? this.router.navigate([lastPageBeferoLogin]) : this.router.navigate(['/'])
      },
      (errors) => {
        this.errors = errors
      });
  }

  gitHubAuth() {
    this.authenticationService.gitHubAuth()
      .pipe(first())
      .subscribe(
        data => {
          const lastPageBeferoLogin = localStorage.getItem('lastPageBeforeRegistrationOrLogin')
          lastPageBeferoLogin ? this.router.navigate([lastPageBeferoLogin]) : this.router.navigate(['/'])
        },
        (errors) => {
          this.errors = errors
        });
  }
}
