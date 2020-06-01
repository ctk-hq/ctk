import { Component, OnInit, EventEmitter, Inject } from '@angular/core'
import { FormGroup, FormControl, Validator, Validators, FormBuilder } from "@angular/forms"
import { Location } from "@angular/common"
import { Router } from "@angular/router"
import { RestService } from "../../services/rest.service"
import { AuthenticationService } from "../../services/authentication.service"
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { Store } from '@ngrx/store'
import { AppState } from './../../../app.state'
import { User } from '../../store/models'
import * as ProjectActions from './../../store/project.actions'
import * as GlobalAppConfigurationActions from './../../store/actions/global-app-configuration.actions'
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog/confirm-dialog.component'

@Component({
  selector: 'app-recipe',
  templateUrl: './recipe.component.html',
  styleUrls: ['./recipe.component.scss']
})
export class RecipeComponent implements OnInit {
  form: FormGroup 
  recipes = []
  userRecipes = []
  page: number = 1
  beforeCustomSearch: boolean = true
  showSpinner: boolean = true
  formRecipePublish: FormGroup
  activeTab: string = 'search'
  user: User
  constructor(public restService: RestService, public dialog: MatDialog, private store: Store<AppState>, private _location: Location, private authenticationService: AuthenticationService, private router: Router) { }

  ngOnInit(): void {
    this.form = new FormGroup({ searchFor: new FormControl('') })
    this.form.get('searchFor').valueChanges.subscribe(() => {
      this.page = 1
    })
    this.restService.getPopularRecipes().subscribe(({ results }) => {
      this.recipes = results
      this.showSpinner = false
    })
    this.authenticationService.currentUser.subscribe((user) => {
      this.user = user
    })
  }

  onEnter(): void {
    let searchVal = this.form.get('searchFor').value
    this.showSpinner = true

    if (searchVal) {
      this.restService.searchRecipes(searchVal, this.page).subscribe(results => {
        this.page++
        this.beforeCustomSearch ? this.beforeCustomSearch = false : ''
        this.recipes = results.results
        this.showSpinner = false
      })
    } else {
      this.restService.getPopularRecipes().subscribe(({ results }) => {
        this.beforeCustomSearch = true
        this.recipes = results
        this.showSpinner = false
      })
    }
  }

  openPublishRecipeDialog(): void {
    const dialogRef = this.dialog.open(DialogPublishRecipe, {
      width: '600px'
    })
    dialogRef.componentInstance.onRemove.subscribe(this.removeRecipe)
    dialogRef.componentInstance.onUpdate.subscribe(this.addOrUpdateRecipe)
  }

  addOrUpdateRecipe = (data: never) => {
    const index = this.recipes.findIndex(({uuid}) => uuid === data['uuid'])
    index === -1 ? this.recipes.push(data) : this.recipes[index] = data
  }

  viewRecipe(event, uuid: string) {
    event.stopPropagation();
    this.store.dispatch(ProjectActions.ViewRecipe({data: uuid}))
    this.store.dispatch(GlobalAppConfigurationActions.OnRecipeLoadMode())
    this._location.replaceState(`/?recipe=${uuid}`)
  }

  editRecipe(event, recipe: object) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(DialogPublishRecipe, {
      width: '600px',
      data: recipe
    })
    dialogRef.componentInstance.onRemove.subscribe(this.removeRecipe)
    dialogRef.componentInstance.onUpdate.subscribe(this.addOrUpdateRecipe)
  }

  removeRecipe = (event, uuid: string) => {
    event.stopPropagation();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm delete',
        content: 'Are you sure want to delete this recipe?',
      },
    })

    dialogRef
      .afterClosed()
      .subscribe((result: true) => {
        if (result == true) {
          this.restService.removeRecipe(uuid).subscribe(val => {
            const index = this.recipes.findIndex(({uuid: uuidFromArray}) => uuid === uuidFromArray)
            this.recipes.splice(index, 1)
            this.dialog.closeAll()
          })
        }
      })
  }

  handlePublishClick() {
    this.user ? this.openPublishRecipeDialog() : this.router.navigate(['/auth/login/'])
  }

  handleYourRecipesClick() {
    if (this.user) {
      this.showSpinner = true
      this.activeTab = 'yourRecipes'
      this.restService.getUserRecipes().subscribe(({ results }) => {
        this.userRecipes = results
        this.showSpinner = false
      })
    } else {
      this.router.navigate(['/auth/login/'])
    }
  }

  viewRecipeDetails(event, recipe: object) {
    event.stopPropagation();
    this.dialog.open(DialogRecipeDetails, {
      width: '600px',
      data: recipe
    })
  }
}

@Component({
  selector: 'dialog-publish-recipe',
  templateUrl: 'dialog-publish-recipe.html',
  styleUrls: ['./dialog-publish-recipe.scss'],
})
export class DialogPublishRecipe {
  onUpdate = new EventEmitter<object>();
  onRemove = new EventEmitter<string>();
  form: FormGroup
  errors: string[]
  mode: string = 'creating'
  uuid: string
  title: string = ''
  constructor(
    public dialogRef: MatDialogRef<DialogPublishRecipe>,
    public restService: RestService,
    private formBuilder: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: object) {
      this.form = this.formBuilder.group({
        name: new FormControl('', [Validators.required]),
        keywords: new FormControl(''),
        repo: new FormControl(''),
        raw_url: new FormControl(''),
        desc: new FormControl(''),
        private: false
      })
      if(this.data) {
        this.mode = 'editing'
        this.uuid = this.data['uuid']
        this.form.patchValue(this.data)
        this.form.patchValue({keywords: this.data['keywords'].join(', ')})
      }
  }

  addRecipe() {
    this.errors = []
    const fields = this.form.getRawValue()

    const data = {
      ...fields,
      keywords: fields.keywords.split(',').map(str => str.trim())
    }

    if(this.mode === 'editing') this.restService.updateRecipe(this.uuid, data).subscribe(data => {
      this.title = 'Recipe successfully updated'
      setTimeout(() => {
        this.title = ''
      }, 3000)
      this.onUpdate.emit({...data, uuid: this.uuid})
    }, error => this.errors = error)
    else this.restService.createRecipe(data).subscribe(data => {
      this.title = 'Recipe successfully created'
      setTimeout(() => {
        this.title = ''
      }, 3000)
      this.mode = 'editing'
      this.form.patchValue(data)
      this.form.patchValue({keywords: data['keywords'].join(', ')})
      this.uuid = data['uuid']
      this.onUpdate.emit(data)
    }, error => this.errors = error)
  }
}

@Component({
  selector: 'dialog-recipe-details',
  templateUrl: 'dialog-recipe-details.html',
  styleUrls: ['./dialog-recipe-details.scss'],
})
export class DialogRecipeDetails {
  constructor(
    public dialogRef: MatDialogRef<DialogPublishRecipe>,
    @Inject(MAT_DIALOG_DATA) public data: {name: string, desc: string}) {
  }
}