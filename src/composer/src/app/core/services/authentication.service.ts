import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators'
import { environment } from 'src/environments/environment'
import { User } from '../store/models';

@Injectable({
    providedIn: 'root',
  })
export class AuthenticationService {
    private currentUserSubject: BehaviorSubject<User>;
    public currentUser: Observable<User>;
    
    constructor(private http: HttpClient) {
        this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')));
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): User {
        return this.currentUserSubject.value;
    }

    login(data: { username: string, password: string }) {
        return this.http.post<any>(`${environment.apiUrl}/auth/login/`, data)
            .pipe(map(({token, user}) => {
                user.token = token
                // store user details and jwt token in local storage to keep user logged in between page refreshes
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.currentUserSubject.next(user);
                return user;
            }));
    }

    registration(data: {email: string, password: string, confirmPassword: string}) {
        return this.http.post<any>(`${environment.apiUrl}/auth/registration/`, data)
            .pipe(map(({token, user}) => {
                user.token = token
                // store user details and jwt token in local storage to keep user logged in between page refreshes
                // localStorage.setItem('currentUser', JSON.stringify(user));
                // this.currentUserSubject.next(user);
                return user;
            }));
    }

    logout() {
        return this.http.post<any>(`${environment.apiUrl}/auth/logout/`, {})
            .pipe(map(() => {
                localStorage.removeItem('currentUser');
                this.currentUserSubject.next(null);
            }));
        
    }

    gitHubLogin(code: string) {
        return this.http.post<any>(`${environment.apiUrl}/auth/social/github/login/`, { code: code })
            .pipe(map(({token, user}) => {
                user.token = token
                // store user details and jwt token in local storage to keep user logged in between page refreshes
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.currentUserSubject.next(user);
                return user;
            }));
    }

    gitHubAuth() {
        return this.http.post<any>(`${environment.apiUrl}/auth/social/github/auth-server/`, {})
            .pipe(map(({url}) => {
                location.href = url
                return
            }));
    }

    removeUser() {
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
    }
}