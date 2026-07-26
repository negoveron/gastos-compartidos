import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Group, GroupMember } from './groups.models';

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/groups`;

  constructor(private http: HttpClient) {}

  create(nombre: string): Observable<Group> {
    return this.http.post<Group>(`${this.baseUrl}`, { nombre });
  }

  getAll(): Observable<Group[]> {
    return this.http.get<{ groups: Group[] }>(`${this.baseUrl}`).pipe(
      map((response) => response.groups)
    );
  }

  getMembers(groupId: number): Observable<GroupMember[]> {
    return this.http.get<{ members: GroupMember[] }>(`${this.baseUrl}/${groupId}/members`).pipe(
      map((response) => response.members)
    );
  }

  invite(groupId: number, email: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/${groupId}/invite`, { email });
  }

  removeMember(groupId: number, userId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${groupId}/members/${userId}`);
  }
}