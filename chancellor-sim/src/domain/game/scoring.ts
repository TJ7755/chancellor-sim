// Scoring algorithm extracted from ChancellorGame.tsx GameOverModal.
// Calculates a performance score from 0-100 based on economic, fiscal, political, and service metrics.

import { GameState } from '../../types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calcScore(gameState: GameState): number {
  let score = 0;
  score += Math.min(20, (gameState.metadata.currentTurn / 60) * 20);

  const gdp = gameState.economic.gdpGrowthAnnual;
  const inflation = gameState.economic.inflationCPI;
  const unemployment = gameState.economic.unemploymentRate;

  score += Math.max(0, 10 - Math.abs(gdp - 2.5) * 3);
  score += Math.max(0, 10 - Math.abs(inflation - 2.0) * 3);
  score += Math.max(0, 10 - Math.max(0, unemployment - 3.5) * 3);

  const deficit = gameState.fiscal.deficitPctGDP;
  const debt = gameState.fiscal.debtPctGDP;

  score += Math.max(0, 10 - Math.max(0, deficit - 1) * 2.5);
  score += Math.max(0, 10 - Math.max(0, debt - 80) * 0.3);

  score += Math.min(10, gameState.political.governmentApproval / 6);
  score += Math.min(5, gameState.political.pmTrust / 15);
  score += Math.max(0, 10 - gameState.manifesto.totalViolations * 3);

  const serviceValues = [
    gameState.services.nhsQuality,
    gameState.services.educationQuality,
    gameState.services.infrastructureQuality,
    gameState.services.mentalHealthAccess,
    gameState.services.primaryCareAccess,
    gameState.services.socialCareQuality,
    gameState.services.prisonSafety,
    gameState.services.courtBacklogPerformance,
    gameState.services.legalAidAccess,
    gameState.services.policingEffectiveness,
    gameState.services.borderSecurityPerformance,
    gameState.services.railReliability,
    gameState.services.affordableHousingDelivery,
    gameState.services.floodResilience,
    gameState.services.researchInnovationOutput,
  ];
  const avgService = serviceValues.reduce((sum, value) => sum + value, 0) / serviceValues.length;
  score += Math.min(5, (avgService / 100) * 5);

  return Math.round(clamp(0, score, 100));
}

export interface GradeResult {
  score: number;
  grade: string;
  gradeLabel: string;
  gradeColor: string;
}

export function calculateGrade(score: number): GradeResult {
  const grade = score >= 85 ? 'A+' : score >= 75 ? 'A' : score >= 65 ? 'B' :
                score >= 55 ? 'C' : score >= 45 ? 'D' : score >= 30 ? 'E' : 'F';
  const gradeLabel = score >= 85 ? 'Outstanding Chancellor' : score >= 75 ? 'Highly Competent' :
                     score >= 65 ? 'Capable Manager' : score >= 55 ? 'Adequate' :
                     score >= 45 ? 'Below Expectations' : score >= 30 ? 'Poor Performance' : 'Catastrophic';
  const gradeColor = score >= 65 ? 'text-good' : score >= 45 ? 'text-warning' : 'text-bad';
  return { score, grade, gradeLabel, gradeColor };
}
