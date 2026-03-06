export interface IndustrialInterventionTemplate {
  id: string;
  name: string;
  sector: 'clean_energy' | 'advanced_manufacturing' | 'life_sciences' | 'digital' | 'defence' | 'construction';
  annualCost_bn: number;
  turnsToEffect: number;
  successProbability: number;
  productivityGain_pp: number;
  gdpSupplyGain_pp?: number;
}

export const INDUSTRIAL_INTERVENTION_CATALOGUE: IndustrialInterventionTemplate[] = [
  {
    id: 'clean_energy_zone',
    name: 'Clean energy investment zone',
    sector: 'clean_energy',
    annualCost_bn: 1.5,
    turnsToEffect: 12,
    successProbability: 0.65,
    productivityGain_pp: 0.12,
    gdpSupplyGain_pp: 0.05,
  },
  {
    id: 'life_sciences_package',
    name: 'Life sciences investment package',
    sector: 'life_sciences',
    annualCost_bn: 0.8,
    turnsToEffect: 18,
    successProbability: 0.6,
    productivityGain_pp: 0.10,
  },
  {
    id: 'advanced_manufacturing_subsidy',
    name: 'Advanced manufacturing subsidy',
    sector: 'advanced_manufacturing',
    annualCost_bn: 1.2,
    turnsToEffect: 12,
    successProbability: 0.55,
    productivityGain_pp: 0.08,
  },
  {
    id: 'digital_rollout',
    name: 'Digital infrastructure rollout',
    sector: 'digital',
    annualCost_bn: 0.6,
    turnsToEffect: 8,
    successProbability: 0.75,
    productivityGain_pp: 0.06,
  },
  {
    id: 'defence_industrial_topup',
    name: 'Defence industrial investment',
    sector: 'defence',
    annualCost_bn: 0.4,
    turnsToEffect: 6,
    successProbability: 0.7,
    productivityGain_pp: 0.05,
  },
];
