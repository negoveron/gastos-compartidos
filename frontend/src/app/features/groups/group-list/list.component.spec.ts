import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';

import { GroupsService } from '../../../core/groups/groups.service';
import { Group, GroupMember } from '../../../core/groups/groups.models';
import { GroupListComponent } from './list.component';

// Stub components for router routes
@Component({ template: '' })
class StubGroupsListComponent { }

@Component({ template: '' })
class StubCreateGroupComponent { }

describe('GroupListComponent', () => {
  let component: GroupListComponent;
  let fixture: ComponentFixture<GroupListComponent>;
  let groupsService: jasmine.SpyObj<GroupsService>;

  const mockGroups: Group[] = [
    { id: 1, nombre: 'Grupo 1', ownerId: 1, isOwner: true },
    { id: 2, nombre: 'Grupo 2', ownerId: 2, isOwner: false },
  ];

  const mockMembers: GroupMember[] = [
    { userId: 1, email: 'owner@example.com', nombre: 'Owner', isOwner: true },
    { userId: 2, email: 'member@example.com', nombre: 'Member', isOwner: false },
  ];

  beforeEach(waitForAsync(() => {
    const spy = jasmine.createSpyObj('GroupsService', ['getAll', 'getMembers', 'invite', 'removeMember']);

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        RouterTestingModule.withRoutes([
          { path: 'groups/create', component: StubCreateGroupComponent },
          { path: 'groups/list', component: StubGroupsListComponent },
        ]),
      ],
      declarations: [GroupListComponent, StubGroupsListComponent, StubCreateGroupComponent],
      providers: [{ provide: GroupsService, useValue: spy }],
    }).compileComponents();

    groupsService = TestBed.inject(GroupsService) as jasmine.SpyObj<GroupsService>;
    groupsService.getAll.and.returnValue(of(mockGroups));
    groupsService.getMembers.and.returnValue(of(mockMembers));
    groupsService.invite.and.returnValue(of({ success: true }));
    groupsService.removeMember.and.returnValue(of({ success: true }));
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toEqual(['nombre', 'owner', 'actions']);
  });

  it('should load members for a group', () => {
    component.loadMembers(1);

    expect(groupsService.getMembers).toHaveBeenCalledWith(1);
    expect(component.membersByGroupId[1]).toEqual(mockMembers);
  });

  it('should not reload already loaded members', () => {
    component.membersByGroupId[1] = mockMembers;

    component.loadMembers(1);

    expect(groupsService.getMembers).not.toHaveBeenCalled();
  });

  it('should open invite dialog with groupId', () => {
    component.openInviteDialog(1);
    expect(component.inviteDialogOpenForGroupId).toBe(1);
    expect(component.inviteEmail).toBe('');
  });

  it('should close invite dialog', () => {
    component.inviteDialogOpenForGroupId = 1;
    component.inviteEmail = 'test@example.com';

    component.closeInviteDialog();

    expect(component.inviteDialogOpenForGroupId).toBeNull();
    expect(component.inviteEmail).toBe('');
  });

  it('should invite a member successfully', () => {
    groupsService.invite.and.returnValue(of({ success: true }));
    component.inviteDialogOpenForGroupId = 1;
    component.inviteEmail = 'new@example.com';

    component.submitInvite();

    expect(groupsService.invite).toHaveBeenCalledWith(1, 'new@example.com');
  });

  it('should handle invite error', () => {
    groupsService.invite.and.returnValue(
      throwError(() => ({
        error: { error: { message: 'Email no encontrado' } },
      }))
    );
    component.inviteDialogOpenForGroupId = 1;
    component.inviteEmail = 'invalid@example.com';

    component.submitInvite();

    expect(component.inviteError).toBe('Email no encontrado');
  });

  it('should remove a member', () => {
    component.inviteDialogOpenForGroupId = 1; // Set to avoid undefined issues
    spyOn(window, 'confirm').and.returnValue(true);

    component.removeMember(1, 2);

    expect(groupsService.removeMember).toHaveBeenCalledWith(1, 2);
  });

  it('should not remove a member if confirm is cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.removeMember(1, 2);

    expect(groupsService.removeMember).not.toHaveBeenCalled();
  });
});