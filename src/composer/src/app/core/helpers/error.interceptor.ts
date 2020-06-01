import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthenticationService } from '../services/authentication.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private authenticationService: AuthenticationService, private router: Router) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            if (err.status === 401) {
                // auto logout if 401 response returned from api
                this.authenticationService.removeUser()
                this.router.navigate(['/auth/login'])
            } else if (err.status === 400) {
                const errorsMessages = []
                Object.keys(err.error).forEach((key) => {
                    if(Array.isArray(err.error[key])) {
                        err.error[key].forEach(errorMessage => {
                            errorsMessages.push(errorMessage)
                        })
                    }
                    else {
                        errorsMessages.push(err.error[key])
                    }
                })
                return throwError(errorsMessages);
            }
            return throwError(err);
        }))
    }
}