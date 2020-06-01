import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BuildDialogComponent } from './build-dialog.component';

describe('BuildDialogComponent', () => {
  let component: BuildDialogComponent;
  let fixture: ComponentFixture<BuildDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BuildDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuildDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
