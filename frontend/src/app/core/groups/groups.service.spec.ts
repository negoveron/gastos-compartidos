import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { Group, GroupMember } from './groups.models';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  let service: GroupsService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiBaseUrl}/groups`;

  const mockGroup: Group = { id: 1, nombre: 'Grupo de prueba', ownerId: 1, isOwner: true };
  const mockMember: GroupMember = { userId: 2, email: 'member@example.com', nombre: 'Member', isOwner: false };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(GroupsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('create()', () => {
    it('should create a group with the given nombre', (done) => {
      service.create('Nuevo Grupo').subscribe((result) => {
        expect(result).toEqual(mockGroup);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ nombre: 'Nuevo Grupo' });
      req.flush(mockGroup);
    });
  });

  describe('getAll()', () => {
    it('should return an array of groups', (done) => {
      const mockGroups: Group[] = [mockGroup];

      service.getAll().subscribe((result) => {
        expect(result).toEqual(mockGroups);
        expect(result.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}`);
      expect(req.request.method).toBe('GET');
      req.flush({ groups: mockGroups });
    });
  });

  describe('getMembers()', () => {
    it('should return an array of members for a group', (done) => {
      const mockMembers: GroupMember[] = [mockMember];

      service.getMembers(1).subscribe((result) => {
        expect(result).toEqual(mockMembers);
        expect(result.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1/members`);
      expect(req.request.method).toBe('GET');
      req.flush({ members: mockMembers });
    });
  });

  describe('invite()', () => {
    it('should invite a member to a group', (done) => {
      service.invite(1, 'newmember@example.com').subscribe((result) => {
        expect(result).toEqual({ success: true });
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1/invite`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'newmember@example.com' });
      req.flush({ success: true });
    });
  });

  describe('removeMember()', () => {
    it('should remove a member from a group', (done) => {
      service.removeMember(1, 2).subscribe((result) => {
        expect(result).toEqual({ success: true });
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/1/members/2`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });
});