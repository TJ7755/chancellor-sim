// Lean Game Context - orchestrates state management by delegating to extracted modules.
// Previously this was the 3153-line God Object in game-state.tsx.
// Now it delegates to:
//   - state/normalisation.ts (Map/object round-trip handling)
//   - state/persistence.ts (serialisation, save, load)
//   - domain/budget/apply-changes.ts (budget application logic)
//   - domain/game/scoring.ts (performance scoring)
//   - utils/helpers.ts (turn metadata calculation)

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { VotingRecord } from '../mp-system';
import {
  EconomicState,
  FiscalState,
  PoliticalState,
  AdviserSystem,
  FiscalRuleId,
  createInitialEconomicState,
  createInitialFiscalState,
  createInitialMarketState,
  createInitialServicesState,
  createInitialPoliticalState,
  createInitialAdviserSystem,
  createInitialEventState,
  createInitialSpendingReviewState,
  createInitialDebtManagementState,
  createInitialParliamentaryState,
  createInitialExternalSectorState,
  createInitialFinancialStabilityState,
  createInitialDevolutionState,
  createInitialDistributionalState,
  calculateInitialFiscalRuleMetrics,
} from '../game-integration';
import { hireAdviser as hireAdviserHelper, fireAdviser as fireAdviserHelper, AdviserType } from '../adviser-system';
import { ManifestoState, initializeManifestoState } from '../manifesto-system';
import processTurn from '../turn-processor';
import {
  MPSystemState,
  createInitialMPSystem,
  PromiseCategory,
  LobbyingApproach,
  attemptLobbying,
  calculateAllMPStances,
  generateMPConcernProfile,
  DetailedMPStance,
} from '../mp-system';
import { generateAllMPs } from '../mp-data';
import { identifyMPGroups, shouldRecalculateGroups } from '../mp-groups';
import { loadMPs, saveMPs, loadVotingRecords, loadPromises, savePromises } from '../mp-storage';
import { markMessageAsRead } from '../pm-system';
import { BudgetDraft, clearBudgetDraft, readBudgetDraft, writeBudgetDraft } from './budget-draft';
import { normalizeLoadedState } from './normalisation';
import { writeSave, readSave } from './persistence';
import { applyBudgetChangesToState } from '../domain/budget/apply-changes';
import { calculateTurnMetadata } from '../utils/helpers';

// Re-export all types from the central types module
export type {
  GameState,
  GameMetadata,
  DifficultyMode,
  GameActions,
  BudgetChanges,
  EmergencyProgramme,
  EmergencyProgrammesState,
  PMMessageType,
  PMMessage,
  PMRelationshipState,
  SocialMediaGameState,
  DepartmentDEL,
  SpendingReviewState,
  GiltMaturityBucket,
  DebtManagementState,
  SelectCommittee,
  ParliamentaryState,
  ExternalSectorState,
  FinancialStabilityState,
  DevolvdNation,
  LocalGovState,
  DevolutionState,
  IncomeDecile,
  DistributionalState,
  ForecastRiskStatement,
  PolicyScoring,
  ObrForecast,
  ForecastError,
  ObrState,
  CapitalProject,
  CapitalDeliveryState,
  HousingState,
  IndustrialIntervention,
  IndustrialStrategyState,
  PipelineItem,
  LegislativePipelineState,
} from '../types';

// ===========================
// Re-export convenience types from game-integration
// ===========================
export type {
  EconomicState,
  FiscalState,
  MarketState,
  ServicesState,
  PoliticalState,
  AdviserSystem,
  EventState,
  SimulationState,
  FiscalRuleId,
  PolicyRiskModifier,
} from '../game-integration';
export type { ManifestoState } from '../manifesto-system';
export type { MPSystemState, LobbyingApproach, PromiseCategory } from '../mp-system';
export type { BudgetDraft } from './budget-draft';

// ===========================
// Context Creation
// ===========================

const GameStateContext = createContext<import('../types').GameState | undefined>(undefined);
const GameActionsContext = createContext<import('../types').GameActions | undefined>(undefined);
const BudgetDraftContext = createContext<BudgetDraft | null>(null);

// ===========================
// Initial Game State
// ===========================

function createInitialObrState(): import('../types').ObrState {
  return {
    forecastVintages: [],
    latestForecast: null,
    obrCredibilityScore: 62,
    cumulativeForecastErrors: [],
    fiscalHeadroomForecast_bn: 9.9,
    forecastRiskStatement: 'balanced',
  };
}

function createInitialCapitalDeliveryState(): import('../types').CapitalDeliveryState {
  return {
    pipelineCapacity_bn: 80,
    deliveryRiskMultiplier: 0.9,
    projectQueue: [],
    shovelReadyReserve_bn: 8,
    overCapacityTurns: 0,
    deferredCapital_bn: 0,
    procurementPrepCost_bn: 0.2,
  };
}

function createInitialHousingState(): import('../types').HousingState {
  return {
    houseBuilding_annualStarts: 240000,
    housingAffordabilityIndex: 45,
    rentInflation_pct: 6,
    planningBottleneck: 65,
    htbAndSharedOwnership_bn: 1.5,
    infrastructureGuarantees_bn: 2.0,
    planningReformPackage: false,
    councilHouseBuildingGrant_bn: 0.6,
  };
}

function createInitialIndustrialStrategyState(): import('../types').IndustrialStrategyState {
  return {
    activeInterventions: [],
    totalAnnualCost_bn: 0,
    productivityBoostAccumulated: 0,
    failedInterventionCount: 0,
    stateAidRisk: 15,
    exportShockTurnsRemaining: 0,
  };
}

function createInitialLegislativePipelineState(): import('../types').LegislativePipelineState {
  return {
    queue: [],
    hmrcSystemsCapacity: 100,
    consultationLoad: 25,
  };
}

function createInitialGameState(): import('../types').GameState {
  const economic = createInitialEconomicState();
  const fiscal = createInitialFiscalState();
  const markets = createInitialMarketState();
  const services = createInitialServicesState();
  const political = createInitialPoliticalState();
  const advisers = createInitialAdviserSystem();
  const events = createInitialEventState();
  const spendingReview = createInitialSpendingReviewState();
  const debtManagement = createInitialDebtManagementState(
    fiscal.debtNominal_bn,
    markets.bankRate,
    economic.inflationCPI
  );
  const parliamentary = createInitialParliamentaryState() as import('../types').ParliamentaryState;
  const externalSector = createInitialExternalSectorState();
  const financialStability = createInitialFinancialStabilityState();
  const devolution = createInitialDevolutionState() as import('../types').DevolutionState;
  const distributional = createInitialDistributionalState();
  const obr = createInitialObrState();
  const capitalDelivery = createInitialCapitalDeliveryState();
  const housing = createInitialHousingState();
  const industrialStrategy = createInitialIndustrialStrategyState();
  const legislativePipeline = createInitialLegislativePipelineState();
  const manifesto = initializeManifestoState();
  const mpSystem = createInitialMPSystem();
  const initialRuleMetrics = calculateInitialFiscalRuleMetrics(fiscal, economic, political.chosenFiscalRule);

  return {
    metadata: {
      currentTurn: 0,
      currentMonth: 7,
      currentYear: 2024,
      difficultyMode: 'realistic',
      gameStarted: false,
      gameOver: false,
    },
    economic,
    fiscal: {
      ...fiscal,
      fiscalHeadroom_bn: initialRuleMetrics.fiscalHeadroom_bn,
    },
    markets,
    services,
    political: {
      ...political,
      fiscalRuleCompliance: initialRuleMetrics.fiscalRuleCompliance,
    },
    advisers,
    events,
    manifesto,
    simulation: {
      monthlySnapshots: [],
      lastTurnDelta: null,
      obrForecastSnapshot: null,
      lastObrComparison: null,
    },
    policyRiskModifiers: [],
    mpSystem,
    emergencyProgrammes: { active: [] },
    pmRelationship: {
      patience: 70,
      warningsIssued: 0,
      demandsIssued: 0,
      demandsMet: 0,
      lastContactTurn: -1,
      messages: [],
      unreadCount: 0,
      consecutivePoorPerformance: 0,
      reshuffleRisk: 0,
      supportWithdrawn: false,
      finalWarningGiven: false,
      activeDemands: [],
      activeThreats: [],
      messageTemplateLastFiredTurn: {},
    },
    socialMedia: { recentlyUsedPostIds: [] },
    spendingReview,
    debtManagement,
    parliamentary,
    externalSector,
    financialStability,
    devolution,
    distributional,
    obr,
    capitalDelivery,
    housing,
    industrialStrategy,
    legislativePipeline,
  };
}

// ===========================
// Game State Provider
// ===========================

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<import('../types').GameState>(createInitialGameState());
  const [budgetDraft, setBudgetDraftState] = useState<BudgetDraft | null>(() => readBudgetDraft());

  // Auto-save every turn
  useEffect(() => {
    if (gameState.metadata.gameStarted && !gameState.metadata.gameOver) {
      const result = writeSave('chancellor-autosave', gameState);
      if (!result.success) {
        console.warn('[Autosave] Failed:', result.error);
      }
    }
  }, [gameState.metadata.currentTurn, gameState]);

  useEffect(() => {
    if (budgetDraft && budgetDraft.turn !== gameState.metadata.currentTurn) {
      clearBudgetDraft();
      setBudgetDraftState(null);
    }
  }, [budgetDraft, gameState.metadata.currentTurn]);

  // Load autosave on mount
  useEffect(() => {
    const result = readSave('chancellor-autosave');
    if (!result) return;

    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => console.warn('[Load]', w));
    }

    setGameState((prevState) => {
      const normalised = normalizeLoadedState(result.state as import('../types').GameState);
      return {
        ...normalised,
        mpSystem: {
          ...normalised.mpSystem,
          allMPs: prevState.mpSystem.allMPs.size > 0 ? prevState.mpSystem.allMPs : normalised.mpSystem.allMPs,
          votingRecords:
            prevState.mpSystem.votingRecords.size > 0
              ? prevState.mpSystem.votingRecords
              : normalised.mpSystem.votingRecords,
          promises: prevState.mpSystem.promises.size > 0 ? prevState.mpSystem.promises : normalised.mpSystem.promises,
        },
      };
    });
  }, []);

  // Load MP data from IndexedDB on mount
  useEffect(() => {
    async function loadMPData() {
      try {
        console.log('[MP System] Starting MP data load...');
        let mps = await loadMPs();
        const votingRecords = await loadVotingRecords();
        const promises = await loadPromises();

        console.log('[MP System] Loaded from IndexedDB:', {
          mpsLoaded: mps?.size || 0,
          votingRecordsCount: votingRecords.size,
          promisesCount: promises.size,
        });

        if (!mps || mps.size === 0) {
          console.log('[MP System] No MPs found in storage, generating 650 MPs...');
          mps = generateAllMPs();

          if (!mps || mps.size === 0) {
            throw new Error('generateAllMPs() returned empty Map');
          }

          console.log('[MP System] Generated MPs:', mps.size);
          await saveMPs(mps);
          console.log('[MP System] MPs saved to IndexedDB');
        }

        if (mps.size > 0) {
          console.log('[MP System] Setting game state with', mps.size, 'MPs');
          setGameState((prev) => ({
            ...prev,
            mpSystem: {
              ...prev.mpSystem,
              allMPs: mps!,
              votingRecords,
              promises,
            },
          }));
          console.log('[MP System] Game state updated successfully');
        } else {
          throw new Error('MPs Map is empty after load/generation');
        }
      } catch (error) {
        console.error('[MP System] Failed to load MP data:', error);
        try {
          console.log('[MP System] Attempting emergency MP generation...');
          const freshMPs = generateAllMPs();

          if (!freshMPs || freshMPs.size === 0) {
            throw new Error('Emergency generation failed - received empty Map');
          }

          console.log('[MP System] Emergency generation successful:', freshMPs.size, 'MPs');
          setGameState((prev) => ({
            ...prev,
            mpSystem: {
              ...prev.mpSystem,
              allMPs: freshMPs,
            },
          }));
          console.log('[MP System] Emergency MPs loaded into game state');
        } catch (genError) {
          console.error('[MP System] CRITICAL: Failed to generate MPs:', genError);
          console.error('[MP System] MP system will not function. Check console for errors.');
        }
      }
    }

    loadMPData();
  }, []);

  // Calculate initial MP stances when MPs are loaded
  useEffect(() => {
    if (gameState.mpSystem.allMPs.size > 0 && gameState.mpSystem.currentBudgetSupport.size === 0) {
      console.log('[MP System] Calculating initial stances for', gameState.mpSystem.allMPs.size, 'MPs...');
      const emptyBudgetChanges: import('../types').BudgetChanges = {};
      const noViolations: string[] = [];

      const initialStances = calculateAllMPStances(
        gameState.mpSystem,
        emptyBudgetChanges,
        noViolations,
        gameState.metadata.currentTurn,
        {
          whipStrength: gameState.parliamentary.whipStrength,
          taxDistribution: gameState.distributional.lastTaxChangeDistribution,
        }
      );

      console.log('[MP System] Initial stances calculated:', {
        total: initialStances.size,
        support: Array.from(initialStances.values()).filter((s) => s.stance === 'support').length,
        oppose: Array.from(initialStances.values()).filter((s) => s.stance === 'oppose').length,
        undecided: Array.from(initialStances.values()).filter((s) => s.stance === 'undecided').length,
      });

      setGameState((prev) => ({
        ...prev,
        mpSystem: {
          ...prev.mpSystem,
          currentBudgetSupport: initialStances,
        },
      }));
    }
  }, [
    gameState.mpSystem.allMPs.size,
    gameState.mpSystem.currentBudgetSupport.size,
    gameState.metadata.currentTurn,
    gameState.mpSystem,
    gameState.parliamentary.whipStrength,
    gameState.distributional.lastTaxChangeDistribution,
  ]);

  // Start new game
  const startNewGame = useCallback(
    (
      playerName?: string,
      manifestoId: string = 'cautious-centrist',
      fiscalRuleId: FiscalRuleId = 'starmer-reeves',
      difficultyMode: import('../types').DifficultyMode = 'realistic'
    ) => {
      setGameState((prevState) => {
        const newState = createInitialGameState();
        const initialRuleMetrics = calculateInitialFiscalRuleMetrics(newState.fiscal, newState.economic, fiscalRuleId);

        let workingMPs = prevState.mpSystem.allMPs;
        if (workingMPs.size === 0) {
          console.log('[MP System] No MPs in state during startNewGame, generating...');
          workingMPs = generateAllMPs();
          saveMPs(workingMPs);
        }

        return {
          ...newState,
          metadata: {
            ...newState.metadata,
            currentYear: 2024,
            currentTurn: 0,
            playerName: playerName || 'Chancellor',
            gameStarted: true,
            difficultyMode,
          },
          fiscal: {
            ...newState.fiscal,
            fiscalHeadroom_bn: initialRuleMetrics.fiscalHeadroom_bn,
          },
          political: {
            ...newState.political,
            chosenFiscalRule: fiscalRuleId,
            fiscalRuleCompliance: initialRuleMetrics.fiscalRuleCompliance,
          },
          mpSystem: {
            ...newState.mpSystem,
            allMPs: workingMPs,
          },
          manifesto: initializeManifestoState(manifestoId),
        };
      });
      setBudgetDraftState(null);
      clearBudgetDraft();
    },
    []
  );

  // Advance turn
  const advanceTurn = useCallback(() => {
    setGameState((prevState) => {
      if (prevState.metadata.gameOver) return prevState;

      const newTurn = prevState.metadata.currentTurn + 1;
      const { month, year } = calculateTurnMetadata(newTurn);

      if (newTurn >= 60) {
        return {
          ...prevState,
          metadata: {
            ...prevState.metadata,
            currentTurn: newTurn,
            currentMonth: month,
            currentYear: year,
            gameOver: true,
            gameOverReason: 'Survived full term! Election time.',
          },
        };
      }

      const stateWithUpdatedMetadata = {
        ...prevState,
        metadata: {
          ...prevState.metadata,
          currentTurn: newTurn,
          currentMonth: month,
          currentYear: year,
        },
      };

      try {
        const processedState = processTurn(stateWithUpdatedMetadata);
        return processedState;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Turn Processor] Fatal error during turn processing:', message);
        console.error('[Turn Processor] Turn:', newTurn, 'Month:', month, 'Year:', year);
        return {
          ...prevState,
          metadata: {
            ...prevState.metadata,
            currentTurn: newTurn,
            currentMonth: month,
            currentYear: year,
            gameOver: true,
            gameOverReason: `A critical error occurred during turn processing: ${message}. Your chancellorship has ended.`,
          },
        };
      }
    });
    setBudgetDraftState(null);
    clearBudgetDraft();
  }, []);

  // Save game
  const saveGame = useCallback(
    (slotName: string) => {
      const result = writeSave(`chancellor-save-${slotName}`, {
        ...gameState,
        metadata: { ...gameState.metadata, lastSaveTime: Date.now() },
      });
      if (!result.success) {
        console.error('[Save] Named save failed:', result.error);
      }
      return result;
    },
    [gameState]
  );

  // Load game
  const loadGame = useCallback((slotName: string): boolean => {
    const result = readSave(`chancellor-save-${slotName}`);
    if (!result) return false;

    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => console.warn('[Load]', w));
    }

    setGameState((prevState) => {
      const normalised = normalizeLoadedState(result.state as import('../types').GameState);
      return {
        ...normalised,
        mpSystem: {
          ...normalised.mpSystem,
          allMPs: prevState.mpSystem.allMPs.size > 0 ? prevState.mpSystem.allMPs : normalised.mpSystem.allMPs,
          votingRecords:
            prevState.mpSystem.votingRecords.size > 0
              ? prevState.mpSystem.votingRecords
              : normalised.mpSystem.votingRecords,
          promises: prevState.mpSystem.promises.size > 0 ? prevState.mpSystem.promises : normalised.mpSystem.promises,
        },
      };
    });
    setBudgetDraftState(null);
    clearBudgetDraft();
    return true;
  }, []);

  // Apply budget changes - delegates to domain/budget/apply-changes.ts
  const applyBudgetChanges = useCallback((changes: import('../types').BudgetChanges) => {
    setGameState((prevState) => {
      return applyBudgetChangesToState(prevState, changes);
    });
  }, []);

  // Respond to event
  const respondToEvent = useCallback((eventId: string, responseIndex: number) => {
    setGameState((prevState) => {
      const pendingEvents = prevState.events.pendingEvents || [];
      const eventIndex = pendingEvents.findIndex(
        (e: import('../types').EmergencyProgramme & { id?: string }) => e.id === eventId
      );
      if (eventIndex === -1) return prevState;

      const event = pendingEvents[eventIndex];
      const responseOptions = (event as unknown as Record<string, unknown>).responseOptions as
        | import('../events-media').EventResponseOption[]
        | undefined;
      if (!responseOptions || responseIndex < 0 || responseIndex >= responseOptions.length) return prevState;

      const chosenResponse = responseOptions[responseIndex];
      let newState = { ...prevState };

      const impact = chosenResponse.economicImpact;
      if (impact) {
        if (impact.gdpGrowth) {
          newState = {
            ...newState,
            economic: { ...newState.economic, gdpGrowthAnnual: newState.economic.gdpGrowthAnnual + impact.gdpGrowth },
          };
        }
        if (impact.inflation) {
          newState = {
            ...newState,
            economic: { ...newState.economic, inflationCPI: newState.economic.inflationCPI + impact.inflation },
          };
        }
        if (impact.unemployment) {
          newState = {
            ...newState,
            economic: {
              ...newState.economic,
              unemploymentRate: newState.economic.unemploymentRate + impact.unemployment,
            },
          };
        }
        if (impact.approvalRating) {
          newState = {
            ...newState,
            political: {
              ...newState.political,
              governmentApproval: Math.max(
                10,
                Math.min(80, newState.political.governmentApproval + impact.approvalRating)
              ),
            },
          };
        }
        if (impact.pmTrust) {
          newState = {
            ...newState,
            political: {
              ...newState.political,
              pmTrust: Math.max(0, Math.min(100, newState.political.pmTrust + impact.pmTrust)),
            },
          };
        }
        if (impact.giltYieldBps) {
          newState = {
            ...newState,
            markets: { ...newState.markets, giltYield10y: newState.markets.giltYield10y + impact.giltYieldBps / 100 },
          };
        }
        if (impact.sterlingPercent) {
          newState = {
            ...newState,
            markets: {
              ...newState.markets,
              sterlingIndex: newState.markets.sterlingIndex * (1 + impact.sterlingPercent / 100),
            },
          };
        }
      }

      // Sector-specific strike resolution
      if (String(event.id).startsWith('sector_nhs_')) {
        if (chosenResponse.label === 'Meet pay demands') {
          const affectedWorkforceWageBill = 60;
          const settlementRate = 5;
          const annualisedCost = (affectedWorkforceWageBill * settlementRate) / 100;
          newState = {
            ...newState,
            fiscal: {
              ...newState.fiscal,
              spending: {
                ...newState.fiscal.spending,
                nhsCurrent: newState.fiscal.spending.nhsCurrent + annualisedCost,
                nhs: newState.fiscal.spending.nhsCurrent + annualisedCost + newState.fiscal.spending.nhsCapital,
              },
            },
            services: { ...newState.services, nhsStrikeMonthsRemaining: 0 },
          };
        } else if (chosenResponse.label === 'Legislate against strike') {
          newState = {
            ...newState,
            political: {
              ...newState.political,
              backbenchSatisfaction: Math.max(10, newState.political.backbenchSatisfaction - 10),
              pmTrust: Math.max(0, newState.political.pmTrust - 8),
              governmentApproval: Math.max(10, newState.political.governmentApproval - 5),
            },
            services: { ...newState.services, nhsStrikeMonthsRemaining: 0 },
          };
        }
      }

      if (String(event.id).startsWith('sector_teacher_')) {
        if (chosenResponse.label === 'Meet pay demands') {
          const affectedWorkforceWageBill = 45;
          const settlementRate = 5;
          const annualisedCost = (affectedWorkforceWageBill * settlementRate) / 100;
          newState = {
            ...newState,
            fiscal: {
              ...newState.fiscal,
              spending: {
                ...newState.fiscal.spending,
                educationCurrent: newState.fiscal.spending.educationCurrent + annualisedCost,
                education:
                  newState.fiscal.spending.educationCurrent +
                  annualisedCost +
                  newState.fiscal.spending.educationCapital,
              },
            },
            services: { ...newState.services, educationStrikeMonthsRemaining: 0 },
          };
        } else if (chosenResponse.label === 'Legislate against strike') {
          newState = {
            ...newState,
            political: {
              ...newState.political,
              backbenchSatisfaction: Math.max(10, newState.political.backbenchSatisfaction - 10),
              pmTrust: Math.max(0, newState.political.pmTrust - 8),
              governmentApproval: Math.max(10, newState.political.governmentApproval - 5),
            },
            services: { ...newState.services, educationStrikeMonthsRemaining: 0 },
          };
        }
      }

      newState = {
        ...newState,
        fiscal: {
          ...newState.fiscal,
          totalSpending_bn:
            newState.fiscal.spending.nhs +
            newState.fiscal.spending.education +
            newState.fiscal.spending.defence +
            newState.fiscal.spending.welfare +
            newState.fiscal.spending.infrastructure +
            newState.fiscal.spending.police +
            newState.fiscal.spending.justice +
            newState.fiscal.spending.other,
        },
      };

      let newEmergencyProgrammes = [...newState.emergencyProgrammes.active];
      if (chosenResponse.fiscalCost && chosenResponse.rebuildingMonths) {
        const programmeName = (event as unknown as Record<string, unknown>).title + ' - ' + chosenResponse.label;
        const programme: import('../types').EmergencyProgramme = {
          id: eventId + '-programme',
          eventId: eventId,
          name: programmeName,
          immediateCost_bn: chosenResponse.fiscalCost,
          rebuildingMonths: chosenResponse.rebuildingMonths,
          rebuildingCostPerMonth_bn: chosenResponse.rebuildingCostPerMonth || 0,
          remainingMonths: chosenResponse.rebuildingMonths,
          description: 'Emergency response to ' + (event as unknown as Record<string, unknown>).title,
        };
        newEmergencyProgrammes.push(programme);
      }

      const remainingPending = [...pendingEvents];
      remainingPending.splice(eventIndex, 1);

      newState = {
        ...newState,
        events: {
          ...newState.events,
          pendingEvents: remainingPending,
          eventLog: [
            ...(newState.events.eventLog || []),
            { event, playerResponse: chosenResponse.label, resolved: true },
          ],
        },
        emergencyProgrammes: {
          ...newState.emergencyProgrammes,
          active: newEmergencyProgrammes,
        },
      };

      return newState;
    });
  }, []);

  // Hire adviser
  const hireAdviser = useCallback((adviserType: string) => {
    setGameState((prevState) => {
      const updatedAdviserSystem = hireAdviserHelper(
        prevState.advisers as unknown as Parameters<typeof hireAdviserHelper>[0],
        adviserType as AdviserType,
        prevState.metadata.currentTurn
      );
      return {
        ...prevState,
        advisers: updatedAdviserSystem as unknown as AdviserSystem,
      };
    });
  }, []);

  // Fire adviser
  const fireAdviser = useCallback((adviserId: string) => {
    setGameState((prevState) => {
      const updatedAdviserSystem = fireAdviserHelper(
        prevState.advisers as unknown as Parameters<typeof fireAdviserHelper>[0],
        adviserId as AdviserType
      );
      return {
        ...prevState,
        advisers: updatedAdviserSystem as unknown as AdviserSystem,
      };
    });
  }, []);

  // Respond to PM intervention
  const respondToPMIntervention = useCallback((choice: 'comply' | 'defy') => {
    setGameState((prevState) => {
      if (!prevState.political.pmInterventionsPending || prevState.political.pmInterventionsPending.length === 0) {
        return prevState;
      }

      const event = prevState.political.pmInterventionsPending[0];
      let newState = { ...prevState };
      const remainingInterventions = (newState.political.pmInterventionsPending || []).slice(1);

      if (choice === 'comply') {
        const consequences = event.consequencesIfComply;
        let fiscal = {
          ...newState.fiscal,
          spending: { ...newState.fiscal.spending },
        };
        const budgetChanges: import('../types').BudgetChanges = {};

        if (event.triggerReason === 'backbench_revolt') {
          const concession = 3.0;
          budgetChanges.nhsCurrentChange = concession;
        } else if (event.triggerReason === 'manifesto_breach') {
          const recent = [...newState.manifesto.pledges]
            .filter((pledge) => pledge.violated)
            .sort((a, b) => (b.turnViolated || 0) - (a.turnViolated || 0))[0];
          if (recent) {
            if (recent.id.includes('income-tax')) {
              budgetChanges.incomeTaxBasicChange =
                -(fiscal.incomeTaxBasicRate - fiscal.startingTaxRates.incomeTaxBasic) * 0.5;
              budgetChanges.incomeTaxHigherChange =
                -(fiscal.incomeTaxHigherRate - fiscal.startingTaxRates.incomeTaxHigher) * 0.5;
              budgetChanges.incomeTaxAdditionalChange =
                -(fiscal.incomeTaxAdditionalRate - fiscal.startingTaxRates.incomeTaxAdditional) * 0.5;
            } else if (recent.id.includes('ni')) {
              budgetChanges.niEmployeeChange =
                -(fiscal.nationalInsuranceRate - fiscal.startingTaxRates.niEmployee) * 0.5;
              budgetChanges.niEmployerChange = -(fiscal.employerNIRate - fiscal.startingTaxRates.niEmployer) * 0.5;
            } else if (recent.id.includes('vat')) {
              budgetChanges.vatChange = -(fiscal.vatRate - fiscal.startingTaxRates.vat) * 0.5;
            } else if (recent.id.includes('corp')) {
              budgetChanges.corporationTaxChange =
                -(fiscal.corporationTaxRate - fiscal.startingTaxRates.corporationTax) * 0.5;
            } else if (recent.targetDepartment === 'nhs') {
              const target = fiscal.fiscalYearStartSpending.nhs * 1.02;
              const delta = (target - fiscal.spending.nhs) * 0.5;
              budgetChanges.nhsCurrentChange = delta;
            } else if (recent.targetDepartment === 'education') {
              const target = fiscal.fiscalYearStartSpending.education * 1.02;
              const delta = (target - fiscal.spending.education) * 0.5;
              budgetChanges.educationCurrentChange = delta;
            }
          }
        } else if (event.triggerReason === 'approval_collapse') {
          budgetChanges.nhsCurrentChange = 2.0;
          budgetChanges.welfareCurrentChange = 0.5;
        } else if (event.triggerReason === 'economic_crisis') {
          const consolidation = 5.0;
          const departmentalCut = consolidation / 5;
          budgetChanges.defenceCurrentChange = -departmentalCut;
          budgetChanges.infrastructureCurrentChange = -departmentalCut;
          budgetChanges.policeCurrentChange = -departmentalCut;
          budgetChanges.justiceCurrentChange = -departmentalCut;
          budgetChanges.otherCurrentChange = -departmentalCut;
        } else if (event.triggerReason === 'fiscal_rule_oc') {
          const consolidation = 6.0;
          const departmentalCut = consolidation / 6;
          budgetChanges.defenceCurrentChange = -departmentalCut;
          budgetChanges.infrastructureCurrentChange = -departmentalCut;
          budgetChanges.policeCurrentChange = -departmentalCut;
          budgetChanges.justiceCurrentChange = -departmentalCut;
          budgetChanges.otherCurrentChange = -departmentalCut * 2;
        }

        if (budgetChanges.incomeTaxBasicChange !== undefined)
          fiscal.incomeTaxBasicRate += budgetChanges.incomeTaxBasicChange;
        if (budgetChanges.incomeTaxHigherChange !== undefined)
          fiscal.incomeTaxHigherRate += budgetChanges.incomeTaxHigherChange;
        if (budgetChanges.incomeTaxAdditionalChange !== undefined)
          fiscal.incomeTaxAdditionalRate += budgetChanges.incomeTaxAdditionalChange;
        if (budgetChanges.niEmployeeChange !== undefined)
          fiscal.nationalInsuranceRate += budgetChanges.niEmployeeChange;
        if (budgetChanges.niEmployerChange !== undefined) fiscal.employerNIRate += budgetChanges.niEmployerChange;
        if (budgetChanges.vatChange !== undefined) fiscal.vatRate += budgetChanges.vatChange;
        if (budgetChanges.corporationTaxChange !== undefined)
          fiscal.corporationTaxRate += budgetChanges.corporationTaxChange;
        if (budgetChanges.nhsCurrentChange !== undefined) fiscal.spending.nhsCurrent += budgetChanges.nhsCurrentChange;
        if (budgetChanges.educationCurrentChange !== undefined)
          fiscal.spending.educationCurrent += budgetChanges.educationCurrentChange;
        if (budgetChanges.defenceCurrentChange !== undefined)
          fiscal.spending.defenceCurrent += budgetChanges.defenceCurrentChange;
        if (budgetChanges.welfareCurrentChange !== undefined)
          fiscal.spending.welfareCurrent += budgetChanges.welfareCurrentChange;
        if (budgetChanges.infrastructureCurrentChange !== undefined)
          fiscal.spending.infrastructureCurrent += budgetChanges.infrastructureCurrentChange;
        if (budgetChanges.policeCurrentChange !== undefined)
          fiscal.spending.policeCurrent += budgetChanges.policeCurrentChange;
        if (budgetChanges.justiceCurrentChange !== undefined)
          fiscal.spending.justiceCurrent += budgetChanges.justiceCurrentChange;
        if (budgetChanges.otherCurrentChange !== undefined)
          fiscal.spending.otherCurrent += budgetChanges.otherCurrentChange;

        fiscal.spending.nhs = fiscal.spending.nhsCurrent + fiscal.spending.nhsCapital;
        fiscal.spending.education = fiscal.spending.educationCurrent + fiscal.spending.educationCapital;
        fiscal.spending.defence = fiscal.spending.defenceCurrent + fiscal.spending.defenceCapital;
        fiscal.spending.welfare = fiscal.spending.welfareCurrent;
        fiscal.spending.infrastructure = fiscal.spending.infrastructureCurrent + fiscal.spending.infrastructureCapital;
        fiscal.spending.police = fiscal.spending.policeCurrent + fiscal.spending.policeCapital;
        fiscal.spending.justice = fiscal.spending.justiceCurrent + fiscal.spending.justiceCapital;
        fiscal.spending.other = fiscal.spending.otherCurrent + fiscal.spending.otherCapital;
        fiscal.totalSpending_bn =
          fiscal.spending.nhs +
          fiscal.spending.education +
          fiscal.spending.defence +
          fiscal.spending.welfare +
          fiscal.spending.infrastructure +
          fiscal.spending.police +
          fiscal.spending.justice +
          fiscal.spending.other;

        newState.political = {
          ...newState.political,
          pmTrust: Math.max(0, Math.min(100, newState.political.pmTrust + (consequences.pmTrustChange || 0))),
          governmentApproval: Math.max(
            0,
            Math.min(
              100,
              newState.political.governmentApproval +
                (consequences.publicApprovalChange || 0) +
                (event.triggerReason === 'approval_collapse' ? 1.5 : 0)
            )
          ),
          backbenchSatisfaction: Math.max(
            0,
            Math.min(100, newState.political.backbenchSatisfaction + (consequences.backbenchSentimentChange || 0))
          ),
          pmInterventionsPending: remainingInterventions,
        };
        newState.fiscal = fiscal;
      } else {
        const consequences = event.consequencesIfDefy;
        newState.political = {
          ...newState.political,
          pmTrust: Math.max(0, Math.min(100, newState.political.pmTrust + (consequences.pmTrustChange || 0))),
          backbenchSatisfaction: Math.max(
            0,
            Math.min(100, newState.political.backbenchSatisfaction + (consequences.backbenchSentimentChange || 0))
          ),
          pmInterventionsPending: remainingInterventions,
        };
        if (consequences.reshuffleRisk && Math.random() * 100 < consequences.reshuffleRisk) {
          newState = {
            ...newState,
            metadata: {
              ...newState.metadata,
              gameOver: true,
              gameOverReason:
                'You defied the Prime Minister one too many times. You have been reshuffled out of the Treasury.',
            },
          };
        }
      }

      return newState;
    });
  }, []);

  // Lobby MP
  const lobbyMP = useCallback(
    async (
      mpId: string,
      approach: LobbyingApproach,
      promiseCategory?: PromiseCategory,
      specificValue?: number
    ): Promise<{ success: boolean; message: string }> => {
      return new Promise((resolve) => {
        setGameState((prevState) => {
          const mp = prevState.mpSystem.allMPs.get(mpId);
          if (!mp) {
            resolve({ success: false, message: 'MP not found' });
            return prevState;
          }

          const brokenPromisesCount = Array.from(prevState.mpSystem.promises.values()).filter(
            (p: { promisedToMPs: string[]; broken: boolean }) => p.promisedToMPs.includes(mpId) && p.broken
          ).length;

          const result = attemptLobbying(mp, approach, undefined, brokenPromisesCount);

          let newState = { ...prevState };

          if (result.success) {
            if (approach === 'promise' && promiseCategory) {
              const { createPromise } = require('../mp-system');
              const newPromise = createPromise(
                promiseCategory,
                [mpId],
                `Promise to ${mp.name} regarding ${promiseCategory}`,
                prevState.metadata.currentTurn,
                specificValue
              );
              const updatedPromises = new Map<string, import('../mp-system').MPPromise>(prevState.mpSystem.promises);
              updatedPromises.set(newPromise.id, newPromise);
              newState.mpSystem = { ...newState.mpSystem, promises: updatedPromises };
              savePromises(updatedPromises);
            }

            const updatedStances = new Map(prevState.mpSystem.currentBudgetSupport);
            const currentStance = prevState.mpSystem.currentBudgetSupport.get(mpId);
            const detailedStance: DetailedMPStance = {
              stance: 'support',
              score: 80,
              reason: `Convinced by Chancellor via ${approach} approach.`,
              concerns: currentStance?.concerns || [],
              ideologicalAlignment: currentStance?.ideologicalAlignment || 0,
              constituencyImpact: currentStance?.constituencyImpact || 0,
              granularImpact: currentStance?.granularImpact || 0,
              brokenPromisesCount: brokenPromisesCount,
              isManualOverride: true,
              overrideTurn: prevState.metadata.currentTurn,
            };
            updatedStances.set(mpId, detailedStance);
            newState.mpSystem = { ...newState.mpSystem, currentBudgetSupport: updatedStances };
          } else if (result.backfired) {
            newState.political = {
              ...newState.political,
              backbenchSatisfaction: Math.max(0, newState.political.backbenchSatisfaction - 5),
            };
          }

          resolve(result);
          return newState;
        });
      });
    },
    []
  );

  // Force PM Intervention
  const forcePMIntervention = useCallback(() => {
    setGameState((prevState) => {
      const newPolitical = {
        ...prevState.political,
        pmTrust: Math.max(0, prevState.political.pmTrust - 20),
        backbenchSatisfaction: Math.max(0, prevState.political.backbenchSatisfaction - 15),
        governmentApproval: Math.max(0, prevState.political.governmentApproval - 8),
      };

      const updatedMPs = new Map<string, import('../mp-system').MPProfile>(prevState.mpSystem.allMPs);
      updatedMPs.forEach((mp: import('../mp-system').MPProfile, mpId: string) => {
        if (mp.party === 'labour') {
          updatedMPs.set(mpId, {
            ...mp,
            traits: {
              ...mp.traits,
              rebelliousness: Math.min(10, mp.traits.rebelliousness * 1.5),
            },
          });
        }
      });

      return {
        ...prevState,
        political: newPolitical,
        mpSystem: { ...prevState.mpSystem, allMPs: updatedMPs },
      };
    });
  }, []);

  // Update MP stances
  const updateMPStances = useCallback(
    (budgetChanges: import('../types').BudgetChanges, manifestoViolations: string[]) => {
      setGameState((prevState) => {
        const newStances = calculateAllMPStances(
          prevState.mpSystem,
          budgetChanges,
          manifestoViolations,
          prevState.metadata.currentTurn,
          {
            whipStrength: prevState.parliamentary.whipStrength,
            taxDistribution: prevState.distributional.lastTaxChangeDistribution,
          }
        );

        const updatedConcernProfiles = new Map<string, import('../mp-system').MPConcernProfile>(prevState.mpSystem.concernProfiles);
        prevState.mpSystem.allMPs.forEach((mp: import('../mp-system').MPProfile, mpId: string) => {
          if (mp.party === 'labour' && !updatedConcernProfiles.has(mpId)) {
            updatedConcernProfiles.set(mpId, generateMPConcernProfile(mp));
          }
        });

        const shouldUpdateGroups = shouldRecalculateGroups(
          prevState.mpSystem.currentBudgetSupport,
          newStances,
          prevState.mpSystem.allMPs
        );

        let updatedGroups = prevState.mpSystem.activeGroups;
        if (shouldUpdateGroups || prevState.mpSystem.activeGroups.length === 0) {
          updatedGroups = identifyMPGroups(
            prevState.mpSystem.allMPs,
            newStances,
            updatedConcernProfiles,
            budgetChanges,
            prevState.metadata.currentMonth
          );
        }

        return {
          ...prevState,
          mpSystem: {
            ...prevState.mpSystem,
            currentBudgetSupport: newStances,
            concernProfiles: updatedConcernProfiles,
            activeGroups: updatedGroups,
          },
        };
      });
    },
    []
  );

  // Execute one-click manifesto pledge
  const executeManifestoOneClick = useCallback((pledgeId: string) => {
    setGameState((prevState) => {
      const { executeOneClickAction } = require('../manifesto-system');
      const pledge = prevState.manifesto.pledges.find((p: import('../manifesto-system').ManifestoPledge) => p.id === pledgeId);
      if (!pledge) {
        console.error(`Pledge ${pledgeId} not found`);
        return prevState;
      }

      const result = executeOneClickAction(
        pledge,
        {
          incomeTaxBasic: prevState.fiscal.incomeTaxBasicRate,
          incomeTaxHigher: prevState.fiscal.incomeTaxHigherRate,
          incomeTaxAdditional: prevState.fiscal.incomeTaxAdditionalRate,
          niEmployee: prevState.fiscal.nationalInsuranceRate,
          niEmployer: prevState.fiscal.employerNIRate,
          vat: prevState.fiscal.vatRate,
          corporationTax: prevState.fiscal.corporationTaxRate,
        },
        prevState.fiscal.startingTaxRates
      );

      if (!result.success || !result.budgetChanges) {
        console.log(result.message);
        return prevState;
      }

      const changes = result.budgetChanges;
      let newFiscal = { ...prevState.fiscal };
      if (changes.incomeTaxBasicChange !== undefined) newFiscal.incomeTaxBasicRate += changes.incomeTaxBasicChange;
      if (changes.incomeTaxHigherChange !== undefined) newFiscal.incomeTaxHigherRate += changes.incomeTaxHigherChange;
      if (changes.incomeTaxAdditionalChange !== undefined)
        newFiscal.incomeTaxAdditionalRate += changes.incomeTaxAdditionalChange;
      if (changes.niEmployeeChange !== undefined) newFiscal.nationalInsuranceRate += changes.niEmployeeChange;
      if (changes.niEmployerChange !== undefined) newFiscal.employerNIRate += changes.niEmployerChange;
      if (changes.vatChange !== undefined) newFiscal.vatRate += changes.vatChange;
      if (changes.corporationTaxChange !== undefined) newFiscal.corporationTaxRate += changes.corporationTaxChange;

      if (changes.nhsSpendingChange !== undefined) newFiscal.spending.nhs += changes.nhsSpendingChange;
      if (changes.educationSpendingChange !== undefined)
        newFiscal.spending.education += changes.educationSpendingChange;
      if (changes.defenceSpendingChange !== undefined) newFiscal.spending.defence += changes.defenceSpendingChange;
      if (changes.welfareSpendingChange !== undefined) newFiscal.spending.welfare += changes.welfareSpendingChange;
      if (changes.infrastructureSpendingChange !== undefined)
        newFiscal.spending.infrastructure += changes.infrastructureSpendingChange;
      if (changes.policeSpendingChange !== undefined) newFiscal.spending.police += changes.policeSpendingChange;
      if (changes.otherSpendingChange !== undefined) newFiscal.spending.other += changes.otherSpendingChange;

      newFiscal.totalSpending_bn =
        newFiscal.spending.nhs +
        newFiscal.spending.education +
        newFiscal.spending.defence +
        newFiscal.spending.welfare +
        newFiscal.spending.infrastructure +
        newFiscal.spending.police +
        newFiscal.spending.justice +
        newFiscal.spending.other;

      console.log(result.message);

      const updatedPledges = prevState.manifesto.pledges.map((p: import('../manifesto-system').ManifestoPledge) => {
        if (p.id === pledgeId) {
          return { ...p, oneClickExecuted: true, currentValue: p.targetValue || p.currentValue, violated: false };
        }
        return p;
      });

      return { ...prevState, fiscal: newFiscal, manifesto: { ...prevState.manifesto, pledges: updatedPledges } };
    });
  }, []);

  // Record budget votes
  const recordBudgetVotes = useCallback(
    (votes: Array<{ mpId: string; choice: 'aye' | 'noe' | 'abstain'; reasoning: string; coerced?: boolean }>) => {
      setGameState((prevState) => {
        const updatedVotingRecords = new Map(prevState.mpSystem.votingRecords) as Map<string, VotingRecord>;
        const budgetId = `budget_${prevState.metadata.currentTurn}`;
        const month = prevState.metadata.currentTurn;

        votes.forEach((vote) => {
          let record = updatedVotingRecords.get(vote.mpId);
          if (!record) {
            record = { mpId: vote.mpId, budgetVotes: [], rebellionCount: 0, loyaltyScore: 100 };
          }
          const updatedBudgetVotes = [
            ...record.budgetVotes,
            {
              budgetId,
              month,
              choice: vote.choice,
              reasoning: vote.reasoning,
              coerced: vote.coerced,
            },
          ];
          updatedVotingRecords.set(vote.mpId, { ...record, budgetVotes: updatedBudgetVotes.slice(-20) });
        });

        return {
          ...prevState,
          mpSystem: {
            ...prevState.mpSystem,
            votingRecords: updatedVotingRecords,
            currentBudgetSupport: new Map<string, DetailedMPStance>(
              Array.from(prevState.mpSystem.currentBudgetSupport.entries()).map(([id, stance]) => [
                id,
                { ...stance, isManualOverride: false },
              ])
            ),
          },
        };
      });
    },
    []
  );

  // Update promises
  const updatePromises = useCallback((brokenPromiseIds: string[]) => {
    setGameState((prevState) => {
      const updatedPromises = new Map<string, import('../mp-system').MPPromise>(prevState.mpSystem.promises);
      let changed = false;

      brokenPromiseIds.forEach((id) => {
        const promise = updatedPromises.get(id);
        if (promise && !promise.broken) {
          updatedPromises.set(id, { ...promise, broken: true, brokenInMonth: prevState.metadata.currentTurn });
          changed = true;
        }
      });

      if (!changed) return prevState;

      return { ...prevState, mpSystem: { ...prevState.mpSystem, promises: updatedPromises } };
    });
  }, []);

  const changeFiscalFramework = useCallback((nextRule: FiscalRuleId) => {
    setGameState((prevState) => {
      if (prevState.political.chosenFiscalRule === nextRule) return prevState;

      const recomputed = calculateInitialFiscalRuleMetrics(prevState.fiscal, prevState.economic, nextRule);

      return {
        ...prevState,
        fiscal: { ...prevState.fiscal, fiscalHeadroom_bn: recomputed.fiscalHeadroom_bn },
        political: {
          ...prevState.political,
          chosenFiscalRule: nextRule,
          fiscalRuleChangedLastTurn: true,
          fiscalRuleChangeCount: (prevState.political.fiscalRuleChangeCount || 0) + 1,
          fiscalRuleCompliance: recomputed.fiscalRuleCompliance,
        },
      };
    });
  }, []);

  const markPMMessageAsReadAction = useCallback((messageId: string) => {
    setGameState((prevState) => ({
      ...prevState,
      pmRelationship: markMessageAsRead(prevState.pmRelationship, messageId),
    }));
  }, []);

  const setBudgetDraftAction = useCallback((draft: BudgetDraft | null) => {
    if (!draft) {
      clearBudgetDraft();
      setBudgetDraftState(null);
      return;
    }
    writeBudgetDraft(draft);
    setBudgetDraftState(draft);
  }, []);

  const clearBudgetDraftAction = useCallback(() => {
    clearBudgetDraft();
    setBudgetDraftState(null);
  }, []);

  const recordSocialMediaTemplates = useCallback((templateIds: string[], turn: number) => {
    setGameState((prevState) => {
      if (!templateIds || templateIds.length === 0) return prevState;
      const encoded = templateIds.map((id) => `${turn}:${id}`);
      const merged = [...(prevState.socialMedia?.recentlyUsedPostIds || []), ...encoded];
      const trimmed = Array.from(new Set(merged)).slice(-15);

      if (
        trimmed.length === (prevState.socialMedia?.recentlyUsedPostIds || []).length &&
        trimmed.every((value, index) => value === (prevState.socialMedia?.recentlyUsedPostIds || [])[index])
      ) {
        return prevState;
      }

      return { ...prevState, socialMedia: { recentlyUsedPostIds: trimmed } };
    });
  }, []);

  const setSpendingReviewPlans = useCallback((plans: import('../types').SpendingReviewState['departments']) => {
    setGameState((prevState) => ({
      ...prevState,
      spendingReview: {
        ...prevState.spendingReview,
        departments: plans,
        inReview: false,
        srCredibilityBonus: 8,
        lastReviewTurn: prevState.metadata.currentTurn,
        nextReviewDueTurn: prevState.metadata.currentTurn < 37 ? 37 : Number.MAX_SAFE_INTEGER,
      },
    }));
  }, []);

  const updateSpendingReviewPlans = useCallback((plans: import('../types').SpendingReviewState['departments']) => {
    setGameState((prevState) => ({
      ...prevState,
      spendingReview: { ...prevState.spendingReview, departments: plans },
    }));
  }, []);

  const setDebtIssuanceStrategy = useCallback(
    (strategy: import('../types').DebtManagementState['issuanceStrategy']) => {
      setGameState((prevState) => ({
        ...prevState,
        debtManagement: { ...prevState.debtManagement, issuanceStrategy: strategy },
      }));
    },
    []
  );

  const actions: import('../types').GameActions = {
    startNewGame,
    advanceTurn,
    saveGame,
    loadGame,
    applyBudgetChanges,
    respondToEvent,
    hireAdviser,
    fireAdviser,
    respondToPMIntervention,
    lobbyMP,
    forcePMIntervention,
    updateMPStances,
    executeManifestoOneClick,
    recordBudgetVotes,
    updatePromises,
    changeFiscalFramework,
    markPMMessageAsRead: markPMMessageAsReadAction,
    setBudgetDraft: setBudgetDraftAction,
    clearBudgetDraft: clearBudgetDraftAction,
    recordSocialMediaTemplates,
    setSpendingReviewPlans,
    updateSpendingReviewPlans,
    setDebtIssuanceStrategy,
  };

  return (
    <GameStateContext.Provider value={gameState}>
      <GameActionsContext.Provider value={actions}>
        <BudgetDraftContext.Provider value={budgetDraft}>{children}</BudgetDraftContext.Provider>
      </GameActionsContext.Provider>
    </GameStateContext.Provider>
  );
};

// ===========================
// Hooks
// ===========================

export function useGameState(): import('../types').GameState {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within GameStateProvider');
  }
  return context;
}

export function useGameActions(): import('../types').GameActions {
  const context = useContext(GameActionsContext);
  if (context === undefined) {
    throw new Error('useGameActions must be used within GameStateProvider');
  }
  return context;
}

export function useBudgetDraft(): BudgetDraft | null {
  return useContext(BudgetDraftContext);
}

export function useEconomicState(): EconomicState {
  return useGameState().economic;
}

export function useFiscalState(): FiscalState {
  return useGameState().fiscal;
}

export function usePoliticalState(): PoliticalState {
  return useGameState().political;
}

export function useManifestoState(): ManifestoState {
  return useGameState().manifesto;
}

export function useGameMetadata(): import('../types').GameMetadata {
  return useGameState().metadata;
}

export function useMPSystem(): MPSystemState {
  return useGameState().mpSystem;
}
