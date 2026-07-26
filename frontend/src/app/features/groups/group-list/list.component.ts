import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { Group, GroupMember } from '../../../core/groups/groups.models';
import { GroupsService } from '../../../core/groups/groups.service';

@Component({
  selector: 'app-group-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class GroupListComponent implements OnInit {
  groups$: Observable<Group[]> = this.groupsService.getAll();
  displayedColumns: string[] = ['nombre', 'owner', 'actions'];

  // Track members per group for the members view
  membersByGroupId: Record<number, GroupMember[]> = {};
  loadingMembers: Record<number, boolean> = {};
  inviteDialogOpenForGroupId: number | null = null;
  inviteEmail = '';
  inviteSubmitting = false;
  inviteError: string | null = null;

  constructor(private groupsService: GroupsService) {}

  ngOnInit(): void {}

  loadMembers(groupId: number): void {
    if (this.membersByGroupId[groupId]) {
      return; // Already loaded
    }
    this.loadingMembers[groupId] = true;
    this.groupsService.getMembers(groupId).subscribe({
      next: (members) => {
        this.membersByGroupId[groupId] = members;
        this.loadingMembers[groupId] = false;
      },
      error: () => {
        this.loadingMembers[groupId] = false;
      },
    });
  }

  openInviteDialog(groupId: number): void {
    this.inviteDialogOpenForGroupId = groupId;
    this.inviteEmail = '';
    this.inviteError = null;
  }

  closeInviteDialog(): void {
    this.inviteDialogOpenForGroupId = null;
    this.inviteEmail = '';
    this.inviteError = null;
  }

  submitInvite(): void {
    if (!this.inviteDialogOpenForGroupId || !this.inviteEmail) {
      return;
    }

    this.inviteSubmitting = true;
    this.inviteError = null;

    this.groupsService.invite(this.inviteDialogOpenForGroupId, this.inviteEmail).subscribe({
      next: () => {
        this.inviteSubmitting = false;
        this.closeInviteDialog();
        // Refresh members list
        this.loadMembers(this.inviteDialogOpenForGroupId!);
      },
      error: (err) => {
        this.inviteSubmitting = false;
        this.inviteError = err.error?.error?.message ?? 'Error al invitar al usuario';
      },
    });
  }

  removeMember(groupId: number, userId: number): void {
    if (confirm('¿Estás seguro de remover este miembro?')) {
      this.groupsService.removeMember(groupId, userId).subscribe({
        next: () => {
          // Refresh members list
          this.loadMembers(groupId);
        },
      });
    }
  }
}