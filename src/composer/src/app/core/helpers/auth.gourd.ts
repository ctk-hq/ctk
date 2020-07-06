import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators'
import { AuthenticationService } from '../services/authentication.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    lastPageBeforeRegistrationOrLogin: string
    mapAuthUrls = {
        '/auth/social/github/callback': true,
        '/auth/login': true,
        '/auth/registration': true
    }
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService
    ) {
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(({ urlAfterRedirects }: NavigationEnd) => {
                !this.mapAuthUrls[location.pathname] ? localStorage.setItem('lastPageBeforeRegistrationOrLogin', location.pathname) : '' 
            });
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const currentUser = this.authenticationService.currentUserValue;
        if (currentUser) {
            // logged in so return true
            return true;
        }

        // not logged in so redirect to login page with the return url
        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}