import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';
import { User } from '../../core/auth/auth.models';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  readonly user$: Observable<User | null> = this.authService.currentUser$.pipe(
    switchMap((user) => {
      // On a fresh page reload the in-memory currentUser$ starts as null even
      // though a valid token exists in localStorage — hydrate it from the
      // backend in that case so the display name/email don't flash empty.
      if (user) {
        return of(user);
      }
      return this.authService.isAuthenticated() ? this.authService.me() : of(null);
    })
  );

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {}

  /** Falls back to the email when `nombre` was not provided at registration. */
  displayName(user: User): string {
    return user.nombre || user.email;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
