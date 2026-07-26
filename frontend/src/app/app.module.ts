import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthInterceptor } from './core/auth/auth.interceptor';
import { AuthModule } from './features/auth/auth.module';
import { GroupsModule } from './features/groups/groups.module';
import { HomeComponent } from './features/home/home.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

// AppRoutingModule must be imported AFTER AuthModule and GroupsModule so /login, /register, /groups/list
// and /groups/create (registered via forChild) take precedence over the
// wildcard '**' redirect defined in AppRoutingModule.
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent, HomeComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatSnackBarModule,
    MatCardModule,
    MatButtonModule,
    AuthModule,
    GroupsModule,
    AppRoutingModule,
  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent],
})
export class AppModule {}
