import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { of } from 'rxjs';

import { GroupsService } from '../../../core/groups/groups.service';
import { CreateGroupComponent } from './create.component';

// Stub component for router route
@Component({ template: '' })
class StubGroupsListComponent { }

describe('CreateGroupComponent', () => {
  let component: CreateGroupComponent;
  let fixture: ComponentFixture<CreateGroupComponent>;
  let groupsService: jasmine.SpyObj<GroupsService>;

  beforeEach(waitForAsync(() => {
    const spy = jasmine.createSpyObj('GroupsService', ['create']);

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        RouterTestingModule.withRoutes([
          { path: 'groups/list', component: StubGroupsListComponent },
        ]),
      ],
      declarations: [CreateGroupComponent, StubGroupsListComponent],
      providers: [{ provide: GroupsService, useValue: spy }],
    }).compileComponents();

    groupsService = TestBed.inject(GroupsService) as jasmine.SpyObj<GroupsService>;
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have required validator on nombre field', () => {
    const nombreControl = component.form.controls['nombre'];
    nombreControl.setValue('');
    expect(nombreControl.hasError('required')).toBe(true);
    nombreControl.setValue('test');
    expect(nombreControl.hasError('required')).toBe(false);
  });

  it('should not submit if form is invalid', () => {
    component.submit();

    expect(groupsService.create).not.toHaveBeenCalled();
    expect(component.submitting).toBe(false);
  });

  it('should submit the form with valid data', () => {
    groupsService.create.and.returnValue(of({ id: 1, nombre: 'Nuevo Grupo', ownerId: 1 }));
    component.form.controls['nombre'].setValue('Nuevo Grupo');

    component.submit();

    expect(groupsService.create).toHaveBeenCalledWith('Nuevo Grupo');
  });

  it('should mark form as touched when submitting with invalid form', () => {
    spyOn(component.form, 'markAllAsTouched');
    component.submit();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
  });
});