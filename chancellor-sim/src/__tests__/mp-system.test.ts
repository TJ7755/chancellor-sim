import { attemptLobbying, calculateLobbyingSuccessProbability } from '../mp-system';

const mockMP: any = {
  traits: {
    rebelliousness: 4,
    principled: 4,
    careerist: 4,
  },
  constituency: {
    marginality: 50,
  },
};

describe('MP lobbying probability', () => {
  it('uses the same probability for display calculation and RNG decision', () => {
    const probability = calculateLobbyingSuccessProbability(mockMP, 'persuade', undefined, 0);
    expect(probability).toBe(0.4);

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.39);
    const result = attemptLobbying(mockMP, 'persuade', undefined, 0);
    expect(result.success).toBe(true);
    randomSpy.mockRestore();
  });
});
