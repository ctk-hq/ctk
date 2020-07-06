import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeComponent } from './recipe.component';

describe('RecipeComponent', () => {
  let component: RecipeComponent;
  let fixture: ComponentFixture<RecipeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RecipeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RecipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
