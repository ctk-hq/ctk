import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'
import { StoreModule } from '@ngrx/store'
import { EffectsModule } from '@ngrx/effects'
import { ProjectEffects } from './core/store/effects/projects.effects'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'

import { MatButtonModule } from '@angular/material/button'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatDialogModule } from '@angular/material/dialog'
import { MatSelectModule } from '@angular/material/select'
import { MatTabsModule } from '@angular/material/tabs'
import { ClipboardModule } from '@angular/cdk/clipboard'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { MatButtonToggleModule } from '@angular/material/button-toggle'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSliderModule } from '@angular/material/slider'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatMenuModule } from '@angular/material/menu'
import { MatStepperModule } from '@angular/material/stepper'

import { RepoSearchComponent, DialogDetails, DialogAddCustom } from './core/components/repo-search/repo-search.component'
import { HeaderComponent } from './core/components/header/header.component'
import { CodeViewComponent } from './core/components/code-view/code-view.component'
import { CanvasComponent } from './core/components/canvas/canvas.component'
import { HomeComponent } from './core/components/home/home.component'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { projectReducer } from './core/store/project.reducer'
import { globalSpinnerReducer } from './core/store/reducers/global-spinner.reducer'
import { globalDialogReducer } from './core/store/reducers/global-dialog.reducer'
import { globalConfigurationReducer } from './core/store/reducers/global-app-configuration.reducer'
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'
import { FlexLayoutModule } from '@angular/flex-layout'
import { HighlightModule, HIGHLIGHT_OPTIONS, HighlightOptions } from 'ngx-highlightjs'
import { ManageProjectDialogComponent } from './core/components/dialogs/manage-project-dialog/manage-project-dialog.component'
import { ManageVolumesDialogComponent } from './core/components/dialogs/manage-volumes-dialog/manage-volumes-dialog.component'
import { SpinnerComponent } from './core/components/widgets/spinner/spinner.component'
import { CheckCircleComponent } from './core/components/widgets/check-circle/check-circle.component'
import { AngularSplitModule } from 'angular-split'
import { ConfirmDialogComponent } from './core/components/dialogs/confirm-dialog/confirm-dialog.component'
import { NodeComponent } from './core/components/canvas/jsplumb/node/node.component'
import { NodeService } from './core/components/canvas/jsplumb/node.service'
import { EventEmitterService } from './core/services/event-emitter.service'
import { MarkedPipe } from './core/pipe/marked.pipe'
import { TruncateTextPipe } from './core/pipe/truncate-text.pipe'
import { KeyValueComponent } from './core/components/common/key-value/key-value/key-value.component'
import { ManageNetworksDialogComponent } from './core/components/dialogs/manage-networks-dialog/manage-networks-dialog.component'
import { SideBarComponent } from './core/components/side-bar/side-bar.component'
import { LoginComponent } from './login/login.component'
import { RegistrationComponent } from './registration/registration.component'

import { JwtInterceptor} from './core/helpers/jwt.interceptor'
import { ErrorInterceptor } from './core/helpers/error.interceptor'
import { ManageUserDialogComponent } from './core/components/dialogs/manage-user-dialog/manage-user-dialog.component'
import { CallbackComponent } from './callback/callback.component'
import { ImportDialogComponent } from './core/components/dialogs/import-dialog/import-dialog.component'
import { GlobalDialogComponent } from './core/components/dialogs/global-dialog/global-dialog.component'

import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { RecipeComponent, DialogPublishRecipe, DialogRecipeDetails } from './core/components/recipe/recipe.component';

export function getHighlightLanguages() {
  return {
    yaml: () => import('highlight.js/lib/languages/yaml'),
  }
}

@NgModule({
  declarations: [
    AppComponent,
    RepoSearchComponent,
    DialogDetails,
    DialogAddCustom,
    HeaderComponent,
    CodeViewComponent,
    CanvasComponent,
    HomeComponent,
    ManageProjectDialogComponent,
    ManageVolumesDialogComponent,
    SpinnerComponent,
    CheckCircleComponent,
    ConfirmDialogComponent,
    NodeComponent,
    MarkedPipe,
    TruncateTextPipe,
    KeyValueComponent,
    ManageNetworksDialogComponent,
    SideBarComponent,
    LoginComponent,
    RegistrationComponent,
    ManageUserDialogComponent,
    CallbackComponent,
    ImportDialogComponent,
    GlobalDialogComponent,
    RecipeComponent,
    DialogPublishRecipe,
    DialogRecipeDetails
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatSidenavModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTabsModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatMenuModule,
    MatStepperModule,
    DragDropModule,
    HighlightModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    StoreModule.forRoot({ project: projectReducer, globalSpinnerState: globalSpinnerReducer, globalError: globalDialogReducer, globalAppConfiguration: globalConfigurationReducer }),
    ClipboardModule,
    EffectsModule.forRoot([ProjectEffects]),
    AngularSplitModule.forRoot(),
    CodemirrorModule
  ],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: <HighlightOptions>{
        lineNumbers: true,
        languages: getHighlightLanguages(),
      }
    },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    EventEmitterService,
    NodeService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
