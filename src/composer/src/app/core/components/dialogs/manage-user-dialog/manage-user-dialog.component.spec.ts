import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageUserDialogComponent } from './manage-user-dialog.component';

describe('ManageUserDialogComponent', () => {
  let component: ManageUserDialogComponent;
  let fixture: ComponentFixture<ManageUserDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageUserDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageUserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
