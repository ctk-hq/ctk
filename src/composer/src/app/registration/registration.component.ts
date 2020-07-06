import { Component, OnInit } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'
import { Location } from '@angular/common'
import { first } from 'rxjs/operators'
import { Subject } from 'rxjs'
import { AuthenticationService } from '../core/services/authentication.service'
import { Router } from '@angular/router'

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss']
})
export class RegistrationComponent implements OnInit {

  registrationForm: FormGroup
  errors: string[]
  private unSubscribe$ = new Subject()

  constructor(private formBuilder: FormBuilder, private authenticationService: AuthenticationService, private router: Router, public _location: Location) {
    this.registrationForm = this.formBuilder.group({
      email: new FormControl('', [ Validators.email ]),
      password1: new FormControl('', [ Validators.required ]),
      password2: new FormControl('', [ Validators.required ])
    })
  }

  ngOnInit(): void {
  }

  registration(): void {
    this.authenticationService.registration(this.registrationForm.value)
    .pipe(first())
    .subscribe(
      data => {
        this.router.navigate(['/auth/login'])
      },
      (errors) => {
        this.errors = errors
      });
  }
}
