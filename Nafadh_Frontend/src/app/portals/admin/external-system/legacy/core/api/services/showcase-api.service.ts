import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, tap } from 'rxjs/operators';

import { unwrapData, type ApiData } from '../../profile/jobseeker-profile-api';
import { showcaseActions } from '../../store/showcase/showcase.actions';
import { ApiPaths } from '../api-paths';
import type { ShowcaseItemDto, ShowcasePage, ShowcaseQuery, UpsertShowcaseItemRequestDto } from '../models/showcase.models';

@Injectable({ providedIn: 'root' })
export class ShowcaseApiService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);

  getPage(query: ShowcaseQuery) {
    let params = new HttpParams().set('pageIndex', String(query.pageIndex)).set('pageSize', String(query.pageSize));
    const setIf = (key: string, value: string | undefined) => {
      if (value?.trim()) params = params.set(key, value.trim());
    };
    setIf('q', query.q);
    setIf('category', query.category);
    setIf('status', query.status);
    return this.http.get<ApiData<ShowcasePage>>(ApiPaths.showcaseItems, { params }).pipe(
      map(unwrapData),
      tap((page) => this.store.dispatch(showcaseActions.cachePage({ page })))
    );
  }

  get(id: number) {
    return this.http.get<ApiData<ShowcaseItemDto>>(ApiPaths.showcaseItem(id)).pipe(
      map(unwrapData),
      tap((item) => this.store.dispatch(showcaseActions.itemUpserted({ item })))
    );
  }

  create(body: UpsertShowcaseItemRequestDto) {
    return this.http.post<ApiData<ShowcaseItemDto>>(ApiPaths.showcaseItems, body).pipe(
      map(unwrapData),
      tap((item) => this.store.dispatch(showcaseActions.itemUpserted({ item })))
    );
  }

  update(id: number, body: UpsertShowcaseItemRequestDto) {
    return this.http.put<ApiData<ShowcaseItemDto>>(ApiPaths.showcaseItem(id), body).pipe(
      map(unwrapData),
      tap((item) => this.store.dispatch(showcaseActions.itemUpserted({ item })))
    );
  }

  delete(id: number) {
    return this.http
      .delete<ApiData<{ ok: boolean }>>(ApiPaths.showcaseItem(id))
      .pipe(
        map(unwrapData),
        tap(() => this.store.dispatch(showcaseActions.itemRemoved({ id })))
      );
  }
}
