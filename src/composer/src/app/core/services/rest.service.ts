import { Injectable } from '@angular/core'
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http'
import { Observable, of } from 'rxjs'
import { map, catchError, tap } from 'rxjs/operators'
import { environment } from 'src/environments/environment'
import { Recipe } from '../store/models'

const baseSearchUrl = `${environment.apiUrl}/repo/search`
const baseDetailUrl = `${environment.apiUrl}/repo/detail`
const baseTagsUrl = `${environment.apiUrl}/tags`
const generateCodeUrl = `${environment.apiUrl}/generate`
const baseProjectUrl = `${environment.apiUrl}/project`
const baseRecipeUrl = `${environment.apiUrl}/recipe`
const baseUrl = environment.apiUrl

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
  }),
}

@Injectable({
  providedIn: 'root',
})
export class RestService {
  constructor(private http: HttpClient) {}

  private extractData(res: Response) {
    let body = res
    return body || {}
  }

  searchRepos(searchFor: string, pageNumber: number): Observable<any> {
    return this.http.get(`${baseSearchUrl}/?q=${searchFor}&page=${pageNumber}`, httpOptions).pipe(map(this.extractData))
  }

  getRepoDetails(repoName: string): Observable<any> {
    return this.http.get(`${baseDetailUrl}/?r=${repoName}`, httpOptions).pipe(map(this.extractData))
  }

  getRepoTags(repoName: string, pageNumber: number): Observable<any> {
    return this.http.get(`${baseTagsUrl}/?r=${repoName}&page=${pageNumber}`, httpOptions).pipe(map(this.extractData))
  }

  generateCode(data: object): Observable<any> {
    return this.http.post<any>(`${generateCodeUrl}/`, JSON.stringify(data), httpOptions).pipe(map(this.extractData))
  }

  createProject(data: object): Observable<any> {
    return this.http.post<any>(`${baseProjectUrl}/`, JSON.stringify(data), httpOptions).pipe(map(this.extractData))
  }

  saveProject(data: object, uuid: string): Observable<any> {
    return this.http.put<any>(`${baseProjectUrl}/${uuid}/`, JSON.stringify(data), httpOptions).pipe(map(this.extractData))
  }

  getProject(uuid: string): Observable<any> {
    return this.http.get<any>(`${baseProjectUrl}/${uuid}/`, httpOptions).pipe(map(this.extractData))
  }

  importProject(data: object): Observable<any> {
    return this.http.post<any>(`${baseUrl}/import/`, data, httpOptions).pipe(map(this.extractData))
  }

  getUserProjects(): Observable<any> {
    return this.http.get<any>(`${baseProjectUrl}/private/`, httpOptions).pipe(map(this.extractData))
  }

  removeProject(uuid: string): Observable<any> {
    return this.http.delete(`${baseProjectUrl}/private/${uuid}/`)
  }

  getPopularRecipes(): Observable<any> {
    return this.http.get(`${baseRecipeUrl}/popular/`, httpOptions).pipe(map(this.extractData))
  }

  getUserRecipes(): Observable<any> {
    return this.http.get(`${baseRecipeUrl}/`, httpOptions).pipe(map(this.extractData))
  }

  searchRecipes(searchFor: string, pageNumber: number): Observable<any> {
    return this.http.get(`${baseRecipeUrl}/search/?q=${searchFor}&page=${pageNumber}`, httpOptions).pipe(map(this.extractData))
  }

  createRecipe(data: object): Observable<any> {
    return this.http.post(`${baseRecipeUrl}/`, data, httpOptions).pipe(map(this.extractData))
  }

  updateRecipe(uuid: string, data: object) {
    return this.http.put(`${baseRecipeUrl}/${uuid}/`, data, httpOptions).pipe(map(this.extractData))
  }

  getRecipe(uuid: string): Observable<any> {
    return this.http.get(`${baseRecipeUrl}/${uuid}/`, httpOptions).pipe(map(this.extractData))
  }

  removeRecipe(uuid: string): Observable<any> {
    return this.http.delete(`${baseRecipeUrl}/${uuid}/`, httpOptions).pipe(map(this.extractData))
  }

  sendEmailForNotification(data: object): Observable<any> {
    return this.http.post(`https://y5s47rsecb.execute-api.us-east-1.amazonaws.com/web_public/nuxx/`, data, httpOptions).pipe(map(this.extractData))
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      // TODO: send the error to remote logging infrastructure
      console.error(error) // log to console instead

      // TODO: better job of transforming error for user consumption
      console.log(`${operation} failed: ${error.message}`)

      // Let the app keep running by returning an empty result.
      return of(result as T)
    }
  }
}
