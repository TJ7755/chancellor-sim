export type SectorRevoltType = 'pensioner_revolt' | 'nhs_strike' | 'teacher_strike';

export interface SectorHeadlineTemplate {
  type: SectorRevoltType;
  headline: string;
  subheading: string;
}

export const SECTOR_HEADLINE_TEMPLATES: SectorHeadlineTemplate[] = [
  {
    type: 'pensioner_revolt',
    headline: '{sector} revolt erupts over pension squeeze',
    subheading: 'Campaigners demand guarantees as ministers face pressure in {month}.',
  },
  {
    type: 'nhs_strike',
    headline: '{sector} begins as unions demand {payDemand}',
    subheading: 'Hospitals prepare for disruption while the Treasury weighs concessions in {month}.',
  },
  {
    type: 'teacher_strike',
    headline: '{sector} announced amid dispute over {payDemand}',
    subheading: 'School leaders warn of sustained disruption unless ministers settle the dispute in {month}.',
  },
];

export function renderSectorHeadline(
  type: SectorRevoltType,
  tokens: { sector: string; payDemand: string; month: string }
): { headline: string; subheading: string } {
  const template = SECTOR_HEADLINE_TEMPLATES.find((entry) => entry.type === type) || SECTOR_HEADLINE_TEMPLATES[0];
  const headline = template.headline
    .replace('{sector}', tokens.sector)
    .replace('{payDemand}', tokens.payDemand)
    .replace('{month}', tokens.month);
  const subheading = template.subheading
    .replace('{sector}', tokens.sector)
    .replace('{payDemand}', tokens.payDemand)
    .replace('{month}', tokens.month);
  return { headline, subheading };
}
