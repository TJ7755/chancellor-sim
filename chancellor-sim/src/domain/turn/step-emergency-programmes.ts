import { GameState } from '../../types';

export function processStepEmergencyProgrammes(state: GameState): GameState {
  const { emergencyProgrammes } = state;

  const updatedProgrammes = emergencyProgrammes.active
    .map((prog) => ({
      ...prog,
      remainingMonths: Math.max(0, prog.remainingMonths - 1),
    }))
    .filter((prog) => prog.remainingMonths > 0);

  return {
    ...state,
    emergencyProgrammes: {
      ...emergencyProgrammes,
      active: updatedProgrammes,
    },
  };
}
