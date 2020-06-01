import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageNetworksDialogComponent } from './manage-networks-dialog.component';

describe('ManageNetworksDialogComponent', () => {
  let component: ManageNetworksDialogComponent;
  let fixture: ComponentFixture<ManageNetworksDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageNetworksDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageNetworksDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
