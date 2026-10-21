import {
  canonicalizeEducationDegreeRanks,
  parseEducationDegreeRanks,
  serializeEducationDegreeRanks,
} from './education-degree-ranks.util';

describe('education-degree-ranks.util', () => {
  it('parses and re-numbers ranks, dropping empty labels', () => {
    const parsed = parseEducationDegreeRanks(
      JSON.stringify([
        { rank: 2, labels: ['ماجستير', ' '] },
        { rank: 1, labels: ['دكتوراه', 'PhD', 'phd'] },
      ])
    );
    expect(parsed).toEqual([
      { rank: 1, labels: ['دكتوراه', 'PhD'] },
      { rank: 2, labels: ['ماجستير'] },
    ]);
  });

  it('serializes compact JSON for storage', () => {
    expect(
      serializeEducationDegreeRanks([
        { rank: 9, labels: ['دكتوراه', 'PhD'] },
        { rank: 9, labels: ['ماجستير'] },
      ])
    ).toBe('[{"rank":1,"labels":["دكتوراه","PhD"]},{"rank":2,"labels":["ماجستير"]}]');
  });

  it('rejects invalid JSON and empty ranks on canonicalize', () => {
    expect(canonicalizeEducationDegreeRanks('{')).toBeNull();
    expect(canonicalizeEducationDegreeRanks('[]')).toBeNull();
    expect(canonicalizeEducationDegreeRanks('[{"rank":1,"labels":["دكتوراه"]}]')).toBe(
      '[{"rank":1,"labels":["دكتوراه"]}]'
    );
  });
});
