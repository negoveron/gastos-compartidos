import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';
import { CreateGroupComponent } from './create-group/create.component';
import { GroupListComponent } from './group-list/list.component';

const routes: Routes = [
  { path: 'groups/list', component: GroupListComponent, canActivate: [authGuard] },
  { path: 'groups/create', component: CreateGroupComponent, canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GroupsRoutingModule {}