export interface DELPlanInputs {
  departments: Record<string, {
    name: string;
    resourceDEL_bn: number;
    capitalDEL_bn: number;
    plannedResourceDEL_bn: number[];
    plannedCapitalDEL_bn: number[];
    backlog: number;
    deliveryCapacity: number;
  }>;
  inflationRate: number;
  gdpGrowthProjection: number;
}

export interface DELPlanProjection {
  department: string;
  year1_bn: number;
  year2_bn: number;
  year3_bn: number;
  realGrowthYear1: number;
  realGrowthYear2: number;
  realGrowthYear3: number;
  cumulativeRealGrowth: number;
}

export interface FiscalEnvelopeConstraints {
  annualEnvelope: number;
  threeYearEnvelope: number;
}

export interface DELValidationResult {
  isValid: boolean;
  totalOverEnvelope_bn: number;
  departmentBreaches: string[];
}

export function calculateDELPlanProjections(
  inputs: DELPlanInputs
): DELPlanProjection[] {
  const projections: DELPlanProjection[] = [];

  for (const [key, dept] of Object.entries(inputs.departments)) {
    const year1 = dept.resourceDEL_bn + dept.capitalDEL_bn;
    const year2 = (dept.plannedResourceDEL_bn[1] || dept.resourceDEL_bn) + (dept.plannedCapitalDEL_bn[1] || dept.capitalDEL_bn);
    const year3 = (dept.plannedResourceDEL_bn[2] || dept.resourceDEL_bn) + (dept.plannedCapitalDEL_bn[2] || dept.capitalDEL_bn);

    const realGrowthYear1 = year1 > 0 ? ((year1 - year1) / year1) * 100 : 0;
    const realGrowthYear2 = year1 > 0 ? ((year2 - year1) / year1) * 100 - inputs.inflationRate : 0;
    const realGrowthYear3 = year1 > 0 ? ((year3 - year1) / year1) * 100 - inputs.inflationRate * 2 : 0;
    const cumulativeRealGrowth = realGrowthYear1 + realGrowthYear2 + realGrowthYear3;

    projections.push({
      department: dept.name,
      year1_bn: year1,
      year2_bn: year2,
      year3_bn: year3,
      realGrowthYear1,
      realGrowthYear2,
      realGrowthYear3,
      cumulativeRealGrowth,
    });
  }

  return projections;
}

export function validateDELPlan(
  inputs: DELPlanInputs,
  fiscalEnvelope: FiscalEnvelopeConstraints
): DELValidationResult {
  const departmentBreaches: string[] = [];
  let totalPlan = 0;

  for (const [key, dept] of Object.entries(inputs.departments)) {
    const deptTotal =
      (dept.plannedResourceDEL_bn || []).reduce((acc, value) => acc + value, 0) +
      (dept.plannedCapitalDEL_bn || []).reduce((acc, value) => acc + value, 0);
    totalPlan += deptTotal;
  }

  const totalOverEnvelope_bn = Math.max(0, totalPlan - fiscalEnvelope.threeYearEnvelope);

  if (totalPlan > fiscalEnvelope.threeYearEnvelope) {
    for (const [key, dept] of Object.entries(inputs.departments)) {
      const deptTotal =
        (dept.plannedResourceDEL_bn || []).reduce((acc, value) => acc + value, 0) +
        (dept.plannedCapitalDEL_bn || []).reduce((acc, value) => acc + value, 0);
      const fairShare = totalPlan > 0
        ? fiscalEnvelope.threeYearEnvelope * (deptTotal / totalPlan)
        : 0;
      if (deptTotal > fairShare) {
        departmentBreaches.push(`${dept.name}: +£${(deptTotal - fairShare).toFixed(1)}bn above indicative share`);
      }
    }
  }

  return {
    isValid: totalOverEnvelope_bn === 0,
    totalOverEnvelope_bn,
    departmentBreaches,
  };
}
