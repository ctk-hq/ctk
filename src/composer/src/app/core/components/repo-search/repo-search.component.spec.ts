import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoSearchComponent } from './repo-search.component';

describe('RepoSearchComponent', () => {
  let component: RepoSearchComponent;
  let fixture: ComponentFixture<RepoSearchComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RepoSearchComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RepoSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
