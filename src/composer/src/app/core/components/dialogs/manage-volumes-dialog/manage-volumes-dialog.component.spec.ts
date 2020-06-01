import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageVolumesDialogComponent } from './manage-volumes-dialog.component';

describe('ManageVolumesDialogComponent', () => {
  let component: ManageVolumesDialogComponent;
  let fixture: ComponentFixture<ManageVolumesDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageVolumesDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageVolumesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
