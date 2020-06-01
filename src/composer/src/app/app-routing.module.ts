import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { HomeComponent } from './core/components/home/home.component'
import { LoginComponent } from './login/login.component'
import { RegistrationComponent } from './registration/registration.component'
import { CallbackComponent } from './callback/callback.component'
const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        component: HomeComponent
      },
      {
        path: ':uuid',
        component: HomeComponent
      },
    ],
  },
  {
    path: 'compose',
    children: [
      {
        path: '',
        component: HomeComponent
      },
      {
        path: ':uuid',
        component: HomeComponent
      },
    ],
  },
  {
    path: 'auth',
    children: [
      {
        path: 'social/github/callback',
        component: CallbackComponent
      },
      {
        path: 'login',
        component: LoginComponent
      },
      {
        path: 'registration',
        component: RegistrationComponent
      }
    ],
  },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
