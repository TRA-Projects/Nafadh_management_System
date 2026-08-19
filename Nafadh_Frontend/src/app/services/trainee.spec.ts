import { TestBed } from '@angular/core/testing';

import { Trainee } from './trainee';

describe('Trainee', () => {
  let service: Trainee;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Trainee);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
