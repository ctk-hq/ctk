import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageProjectDialogComponent } from './manage-project-dialog.component';

describe('ManageProjectDialogComponent', () => {
  let component: ManageProjectDialogComponent;
  let fixture: ComponentFixture<ManageProjectDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageProjectDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageProjectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
