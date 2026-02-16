# Chancellor Simulation: Research Summary

## Overview

This document summarises all research compiled for the UK Chancellor simulation game. The game begins on **5 July 2024**, the day the Labour government takes office after winning a landslide (411 seats, 174-seat majority) on just 33.7% of the vote -- the lowest vote share for a majority government in modern UK history.

The player takes the role of Chancellor of the Exchequer and must navigate fiscal policy, political constraints, market reactions, and public opinion over the course of a parliamentary term (up to July 2029).

---

## Research Files

| File | Format | Size | Contents |
|------|--------|------|----------|
| `fiscal-data-july2024.json` | JSON | 1,754 lines | All UK tax rates, thresholds, revenues, ready reckoners, trade/external sector, productivity, OBR forecasts |
| `economic-parameters.json` | JSON | 1,010 lines | Fiscal multipliers, inflation model, market reactions, growth sensitivities, labour market, event triggers, historical calibration |
| `spending-departments-2024.json` | JSON | 579 lines | All government departments, DEL/AME breakdown, staffing, pressures, devolved administrations, debt interest |
| `monetary-policy-fiscal-rules.json` | JSON | 341 lines | MPC composition, Taylor rule, QT, fiscal-monetary interaction, fiscal rules history 1997-2024, gilt market mechanics |
| `political-structure-2024.json` | JSON | 357 lines | Election results, Labour factions, PM-Chancellor dynamic, opposition, media landscape, backbench revolt mechanics |
| `historical-precedents.md` | Markdown | 502 lines | NHS cuts, Truss crisis, strikes, austerity consequences, media patterns, tax change precedents, calibration tables |
| `game-data-comprehensive.json` | JSON | 307 lines | Consolidated starting state and game parameters -- single file for game engine consumption |

---

## 1. Starting Economic State (July 2024)

### Key Macroeconomic Indicators

| Indicator | Value | Context |
|-----------|-------|---------|
| GDP (nominal) | £2,730bn | ~6th largest economy globally |
| GDP growth rate | 0.6% | Tepid recovery from near-recession |
| CPI inflation | 2.0% | Headline back at target |
| Core inflation | 3.3% | Still elevated |
| Services inflation | 5.2% | Key BoE concern |
| Unemployment | 4.2% | Near NAIRU (4.25%) |
| Economic inactivity rate | 22.1% | 2.8m long-term sick (up from 2.0m pre-COVID) |
| Wage growth (nominal) | 5.7% | Outpacing inflation |
| Wage growth (real) | 3.7% | Recovering from cost-of-living squeeze |
| Output gap | -0.4% | Small spare capacity |
| Trend growth | 1.5% | Low by historical standards |

### Public Finances

| Indicator | Value | Context |
|-----------|-------|---------|
| Total revenue | £1,078bn | ~39.2% of GDP |
| Total spending | £1,226bn | ~44.6% of GDP |
| Budget deficit | £87bn | 3.2% of GDP |
| National debt | £2,744bn | 99.5% of GDP |
| Debt interest | £89bn | Tripled from ~£30bn since 2020 |
| Fiscal headroom | £8.9bn | Against fiscal rules (razor-thin) |
| Structural deficit | 2.1% of GDP | Underlying fiscal weakness |

### Financial Markets

| Indicator | Value |
|-----------|-------|
| Bank Rate | 5.25% (cut to 5.00% in August 2024) |
| 10-year gilt yield | 4.15% |
| 30-year gilt yield | 4.55% |
| GBP/USD | 1.29 |
| GBP/EUR | 1.18 |
| FTSE 100 | 8,280 |
| Average house price | £288,000 |
| Average 2-year mortgage rate | 5.5% |

---

## 2. Tax System

### Major Tax Revenue Sources (2024-25 forecasts)

| Tax | Revenue (£bn) | % of total |
|-----|---------------|------------|
| Income tax | 269 | 25.0% |
| National Insurance | 178 | 16.5% |
| VAT | 174 | 16.1% |
| Corporation tax | 89 | 8.3% |
| Council tax | 46 | 4.3% |
| Fuel duties | 25 | 2.3% |
| Business rates | 33 | 3.1% |
| Stamp duties (SDLT) | 13.4 | 1.2% |
| Tobacco duties | 9.9 | 0.9% |
| Alcohol duties | 12.2 | 1.1% |
| Capital gains tax | 15.2 | 1.4% |
| Inheritance tax | 7.5 | 0.7% |
| Insurance premium tax | 8 | 0.7% |
| Air passenger duty | 4 | 0.4% |
| Other | ~194 | ~18% |
| **Total** | **~1,078** | **100%** |

### Key Tax Levers and Ready Reckoners

| Lever | Revenue per unit change | Notes |
|-------|------------------------|-------|
| Income tax basic rate: +1pp | +£7.0bn | Manifesto pledge: no increase (-6 approval if broken) |
| Income tax higher rate: +1pp | +£2.0bn | Manifesto pledge applies |
| NI employee rate: +1pp | +£6.0bn | Manifesto pledge: no increase |
| NI employer rate: +1pp | +£8.5bn | Manifesto pledge applies |
| VAT: +1pp | +£7.5bn | Most politically toxic tax rise (-8 approval if broken) |
| Corporation tax: +1pp | +£3.2bn | Manifesto pledge: no increase |
| CGT aligned with income tax | +£5-14bn | Wide range due to behavioural response; no manifesto constraint |
| Fiscal drag (frozen thresholds) | +£6bn/year | Most revenue-efficient; costs ~0.5 approval/year |
| Personal allowance: -£1,000 | +£6.2bn | Stealth option |
| Fuel duty: +1p/litre | +£0.5bn | Frozen since 2011 |

### Manifesto Tax Locks

Labour pledged **no increases** to income tax rates, NI rates, VAT, or corporation tax -- constraining the four largest tax handles. Breaking any lock costs 4-8 approval points.

Unconstrained revenue options: CGT reform, fiscal drag (frozen thresholds), non-dom status abolition (£2.5bn but uncertain), VAT on private schools (£1.5bn), carried interest reform (£0.7bn), energy windfall tax extension (£1.0bn).

---

## 3. Government Spending

### Total Managed Expenditure: £1,226bn (44.6% of GDP)

**Structure:**
- **Departmental Expenditure Limits (DEL):** £534bn (resource DEL £434bn + capital DEL £100bn) -- Treasury-controlled, set in Spending Reviews
- **Annually Managed Expenditure (AME):** £692bn -- demand-driven (benefits, debt interest, pensions)

### Major Department Budgets (DEL, 2024-25)

| Department | Total DEL (£bn) | Key pressure |
|------------|-----------------|--------------|
| Health & Social Care (NHS) | 180.4 | 7.6m waiting list, 112k vacancies, £11.6bn maintenance backlog |
| Education | 105.3 | SEND deficit £4bn, teacher recruitment crisis |
| Defence | 55.6 | 2.07% GDP; pressure to reach 2.5% (~+£14bn) |
| Transport | 31.2 | HS2 costs £60-70bn, £12bn road maintenance backlog |
| Home Office | 19.8 | 175k asylum backlog, hotel costs £8m/day |
| FCDO | 15.2 | ODA cut to 0.5% GNI; restoring 0.7% costs ~£6bn/year |
| MoJ | 12.2 | Prisons at 99% capacity, 67k court backlog |
| MHCLG | 12.1 | 7 councils bankrupt, 100k+ in temporary accommodation |
| DSIT | 12.0 | R&D target 2.4% GDP (currently 1.7%) |
| DWP (admin only) | 8.4 | Benefits spending is £290bn AME |
| DEFRA | 7.2 | Post-Brexit farm transition, flood risk, water quality |
| DESNZ | 5.8 | Great British Energy, Net Zero investment |
| HMRC | 5.5 | £36bn tax gap; £1 compliance spending returns £5-18 |
| Cabinet Office | 3.5 | Civil service reform |
| DCMS | 2.3 | Smallest major department |

### Benefits Spending (AME, £290bn)

| Benefit | Cost (£bn) |
|---------|-----------|
| State pension (total) | 130 |
| Universal Credit | 38 |
| PIP | 22 |
| Housing benefit | 18 |
| Child benefit | 12.6 |
| ESA | 8 |
| DLA | 7 |
| Attendance allowance | 7 |
| Pension credit | 6 |
| Carer's allowance | 4 |
| Winter fuel payment | 2 |
| Other | 5.5 |

The **state pension** is the single largest item of public spending. The triple lock (rises by the highest of CPI, earnings growth, or 2.5%) costs an additional ~£3-5bn/year above inflation. Removing it saves money but costs -8 approval points.

### Devolved Administrations (Barnett Formula)

| Nation | Block grant (£bn) | Per capita premium vs England |
|--------|-------------------|------------------------------|
| Scotland | 41.0 | +20% |
| Wales | 18.0 | +15% |
| Northern Ireland | 15.5 | +25% |

### Spending Multipliers (Game Calibration)

| Spending type | GDP multiplier (year 1) | Approval impact per £1bn |
|--------------|------------------------|-------------------------|
| Capital investment | 0.08 | +0.3 (lowest political return) |
| NHS | 0.04 | +1.5 (highest political return) |
| Benefits | 0.06 | -0.5 (high multiplier but unpopular) |
| Education | 0.03 | +1.0 |
| Defence | 0.03 | +0.5 |

---

## 4. Monetary Policy and Fiscal Rules

### MPC Composition (July 2024)

9 members. July 2024: held at 5.25% (7-2 vote). August 2024: cut to 5.00% (decisive 5-4 vote, Bailey's vote tipped the balance).

| Member | Role | Lean |
|--------|------|------|
| Andrew Bailey | Governor | Centrist/slightly dovish |
| Dave Ramsden | Deputy Governor | Dovish |
| Sarah Breeden | Deputy Governor | Centrist |
| Huw Pill | Chief Economist | Hawkish |
| Swati Dhingra | External | Dovish |
| Megan Greene | External | Hawkish |
| Ben Broadbent | Deputy Governor | Hawkish (term ending) |
| Catherine Mann | External | Very hawkish (term ending) |
| Jonathan Haskel | External | Hawkish (term ending) |

### BoE Reaction Function

Modified Taylor Rule: `bankRate = 3.5 + 1.5*(inflation - 2.0) + 0.5*(outputGap)`

Key fiscal-monetary interaction: **fiscal expansion of 1% of GDP triggers ~0.50pp BoE rate rise** over 12 months (partially offsetting the fiscal stimulus). Fiscal contraction triggers only ~0.25pp rate cut (asymmetric response).

### Quantitative Tightening

- Peak APF: £895bn; July 2024: ~£690bn
- QT pace: £100bn/year (active sales + maturities)
- Estimated total APF lifetime loss: £100-200bn (indemnified by Treasury, adding to public borrowing)
- Market impact: ~10bp per year of QT at current pace

### Fiscal Rules History

**Every UK fiscal rule since 1997 has been broken, changed, or abandoned within 5 years.**

| Era | Rule | Fate |
|-----|------|------|
| 1997-2008 (Brown) | Current budget balance over the cycle; debt below 40% GDP | Abandoned in financial crisis |
| 2010-15 (Osborne I) | Cyclically-adjusted balance by rolling 5-year period | Debt target repeatedly missed |
| 2015-16 (Osborne II) | Budget surplus by 2019-20 | Abandoned after Brexit |
| 2016-19 (Hammond) | Deficit below 2% GDP by 2020-21 | COVID made all rules irrelevant |
| 2020-22 (Sunak) | Debt falling by 3rd year of forecast | Met with razor-thin headroom; Truss abandoned |
| 2022-24 (Hunt) | Debt falling by 5th year; deficit below 3% | Met with thin headroom |
| 2024- (Reeves) | Current budget balance by 5th year; PSNFL falling by 5th year | Current. Changed debt measure to PSNFL, creating ~£50bn headroom |

**Key insight for game:** Markets care more about the credibility of the fiscal framework than strict rule compliance. The combination of OBR scrutiny + clear rules + adequate headroom is what maintains confidence.

### Gilt Market

- Annual gross issuance: £265bn (net: £128bn)
- Average debt maturity: 14 years (long by international standards -- buffers against rate rises)
- 25% of gilts are index-linked (RPI) -- very inflation-sensitive
- 26% held by foreign investors (most price-sensitive group)
- Typical budget gilt yield reaction: <10bp. Truss mini-budget: +200bp on 30-year gilts

### Credibility Index (Game Mechanic)

Starting value: 65/100. Scale:
- Above 70: Strong credibility
- 50-70: Adequate
- 40-50: Weak
- Below 40: Market crisis likely
- Below 20: Truss-level crisis

Key factors: OBR forecast present (+10, absence -30), fiscal rules compliance (+5, breach -20), debt trajectory (falling +5/year, rising -5/year), IFS positive (+10) or negative (-20), policy U-turns (-10 each).

---

## 5. Political Structure

### Government

- **Party:** Labour (411 seats, 174 majority)
- **PM:** Keir Starmer
- **Chancellor:** Rachel Reeves (first female Chancellor)
- **Vote share:** 33.7% (lowest ever for a majority government)
- **Key vulnerability:** Majority is "wide but shallow" -- many seats won with <40% due to Reform UK splitting the right

### Labour Factions

| Faction | ~MPs | Key concern | Rebellion trigger |
|---------|------|-------------|-------------------|
| Starmerite Centre | 200 | Fiscal credibility, growth | Leftward policy shift |
| Soft Left | 100 | Workers' rights, NHS, poverty | Austerity, welfare cuts, privatisation |
| Trade Union Wing | 50 | Public sector pay, workers' rights | Pay freeze, anti-union measures |
| New Labour Revivalists | 40 | Reform, efficiency, pro-business | Corbynite policies, union capture |
| Blue Labour | 30 | Immigration, industrial jobs | Liberal immigration, cultural issues |
| Socialist Campaign Group | 15 | Redistribution, public ownership | Any fiscal consolidation |

**Rebellion thresholds:**
- 10 MPs: Symbolic (media story only)
- 30 MPs: Significant (government takes notice)
- 60 MPs: Dangerous (may lose vote if opposition unites)
- 88 MPs: Defeats government (very high bar with 174 majority)

### Backbench Satisfaction

Starting: 70/100. Revolt threshold: 40.

Key drains: broken manifesto pledges (-10 each), welfare cuts (-8), public sector pay freeze (-5/year), approval below 30% (-3/month).

### Approval Ratings

Starting: Government 45%, Chancellor 42%.

- Natural decay: ~0.5 points/month in first year
- Loss aversion: negative events weighted 2x vs positive
- Media cycle half-life: 5 days
- Cumulative effects (NHS waiting lists, crime) are permanent drags

### Media Landscape

Right-leaning outlets (Mail, Sun, Telegraph, Express, GB News) are hostile to Labour. Left-leaning outlets (Guardian, Mirror) are broadly supportive but will criticise from the left. The **BBC** sets the news agenda. The **Financial Times** is the most market-influential. The **IFS post-budget briefing** is the single most important external credibility assessment.

---

## 6. Economic Model

### Fiscal Multipliers

| Instrument | Year 1 | Year 2 | Long-run |
|-----------|--------|--------|----------|
| Government investment | 1.00 | 1.30 | 1.50 |
| Government consumption | 0.70 | 0.80 | 0.60 |
| Transfer payments | 0.60 | 0.70 | 0.55 |
| Income tax cut | 0.50 | 0.70 | 0.80 |
| VAT cut | 0.50 | 0.55 | 0.60 |
| Corporation tax cut | 0.20 | 0.35 | 0.55 |
| CGT cut | 0.10 | 0.15 | 0.25 |

All multipliers are higher in recession and lower in boom conditions.

### Automatic Stabilisers

- Tax revenue elasticity to GDP: 1.05 (revenues fall faster than GDP in downturns)
- Spending elasticity to GDP: -0.20 (spending rises as GDP falls, via benefits)
- Overall stabiliser size: 0.50 (a 1% GDP shock is automatically offset by ~0.5% through tax/spending changes)

### Key Economic Relationships

- **Okun's Law:** coefficient -0.35, 2-quarter lag (1pp below-trend growth raises unemployment by 0.35pp)
- **Phillips Curve:** wage coefficient -0.45, NAIRU 4.25% (unemployment 1pp below NAIRU raises wage growth by 0.45pp)
- **Sterling pass-through:** 10% depreciation adds 1.5-2pp to CPI over 12-18 months

### Debt Dynamics

- Average debt maturity: 14 years
- Annual rollover: ~7% of stock
- Index-linked share: 25%
- Per 1pp yield rise: +£8bn/year debt interest
- Per 1pp RPI rise: +£4bn/year debt interest (index-linked gilts)

---

## 7. Event System

### Market Crisis

Triggers: unfunded fiscal expansion >2% GDP without OBR, debt >110% GDP and rising, breaking fiscal rules with poor growth outlook, deficit >8% GDP outside recession.

Effects: gilt yields +100-200bp, sterling -5 to -15%, approval -10 to -20, mortgage rates +1.5-3pp.

### Credit Downgrade

Triggers: debt >105% GDP and rising, deficit >5% GDP for 2+ years, weakening fiscal institutions.

Effects: gilt yields +10-20bp, approval -3, credibility -15.

### Backbench Revolt

Trigger: backbench satisfaction below 40. Probability: 70%.

Effects: approval -5, policy reversal pressure, media intensity doubled.

### Strike Wave

Trigger: public sector real pay cut >3% cumulative.

Effects: approval -3/month, GDP -0.05%/month. Resolution typically requires pay settlement costing £2-5bn.

Strike probability is roughly halved under a Labour government vs Conservative, but returns to normal if pay cuts persist beyond 18 months.

### IFS Verdict

Timing: 3 days after each fiscal event.

- Positive: approval +3, credibility +10
- Negative ("numbers don't add up"): approval -4, credibility -15, gilts +10bp

---

## 8. Historical Calibration

### The Truss Mini-Budget (23 September 2022)

The defining cautionary tale for the simulation:

- **Day 0:** 10-year gilts +30bp, sterling falls
- **Day 3:** Sterling hits all-time low ($1.035). 30-year gilts hit 5.0% (from 3.7%). LDI crisis begins
- **Day 5:** BoE emergency intervention (£65bn gilt purchases)
- **Day 21:** Kwarteng sacked (38 days as Chancellor)
- **Day 27:** Truss resigns (45 days as PM)
- Mortgage rates rose from ~4.7% to ~6.5%. Housing transactions fell ~20%

**Key lesson:** The absence of OBR scrutiny was as damaging as the policies themselves. Markets price fiscal credibility, not just fiscal aggregates.

### NHS Funding Squeezes

NHS has never faced a nominal spending cut, but real-terms constraint causes rapid deterioration:
- Below 2% real growth: waiting lists rise ~500k/year
- Below 1% real growth: service quality visibly deteriorates within 12-18 months
- Real-terms freeze: crisis conditions within 2 years
- Real-terms cut: political crisis within 6-12 months

### Austerity Consequences (2010-2024)

Local government funding cut ~50% in real terms. 800+ libraries closed. ~1,000 children's centres closed. Youth services cut ~70%. Police cut by 21,330 officers. 258 courts closed. Road maintenance backlog reached £12bn. Rough sleeping +169%. Food bank usage +2,993%.

**Electoral timeline:** Austerity can be electorally viable for 1-2 terms with a weak opposition, but creates compounding liability. Conservatives won in 2015, lost majority in 2017, won on Brexit in 2019, suffered worst-ever defeat in 2024.

### Capital Spending Deferrals

Every £1 of deferred maintenance costs £2.50-4.00 to fix later. The compounding timeline:
- Year 1-2: Mostly invisible
- Year 3-5: Physical deterioration begins
- Year 5-10: Non-linear cost escalation
- Year 10+: System-level failures (e.g., RAAC concrete crisis)

---

## 9. Game Design Implications

### Core Tension

The player faces a fundamental fiscal trilemma: they cannot simultaneously (a) keep manifesto tax pledges, (b) fund public services adequately, and (c) meet fiscal rules. Something must give. This is the authentic dilemma faced by every post-2010 Chancellor.

### Revenue Options (Ranked by Political Efficiency)

1. **Fiscal drag** (frozen thresholds): £6bn/year, low visibility, -0.5 approval/year
2. **CGT alignment with income tax:** £5-14bn, medium visibility, -2 approval
3. **Non-dom abolition:** £2.5bn (uncertain), low political cost
4. **Employer NI increase:** £8.5bn/pp, arguably not a "tax on working people" (Labour used this logic in October 2024)
5. **VAT on private schools:** £1.5bn, low political cost for Labour
6. **Income tax rise (basic):** £7bn/pp, high visibility, -6 approval (pledge break)

### Spending Priorities (Ranked by Political Return)

1. **NHS:** Highest approval return per £bn (+1.5/bn). Cutting is political suicide.
2. **Education:** Moderate return (+1.0/bn). Long-term growth benefits.
3. **Defence:** Low direct approval (+0.5/bn) but international credibility. Post-Ukraine, cuts are very costly politically.
4. **Capital investment:** Highest GDP multiplier (0.08) but lowest immediate political return (+0.3/bn).
5. **Benefits:** High GDP multiplier (0.06) but negative approval impact (-0.5/bn).

### Win Conditions (Suggested)

A successful Chancellor should aim for:
- Government approval above 35% at election time
- Backbench satisfaction above 45
- Credibility index above 50
- GDP growth averaging above 1.5%
- Fiscal rules met (or credibly on track)
- No market crisis triggered
- NHS waiting list falling or stable

### Lose Conditions

- Market crisis (Truss scenario)
- Backbench revolt defeating key legislation
- Approval below 20% for 6+ months
- Debt spiralling above 110% GDP with no plan
- Being sacked by the PM

---

## Sources

All data is drawn from publicly available UK government and independent sources:

- **Office for Budget Responsibility (OBR):** Economic and Fiscal Outlook (March 2024), Public Finances Databank, Fiscal Risks and Sustainability Report
- **Office for National Statistics (ONS):** GDP, CPI, Labour Market, Public Sector Finances, Balance of Payments
- **HM Revenue & Customs (HMRC):** Tax receipts, income tax liabilities statistics, tax gap analysis
- **Bank of England:** Monetary Policy Reports, MPC minutes, Financial Stability Reports, APF data
- **Debt Management Office (DMO):** Annual Review, gilt issuance data
- **Institute for Fiscal Studies (IFS):** Green Budget, Tax and Benefit Model, post-budget analysis
- **Resolution Foundation:** Living standards analysis, distributional analysis
- **King's Fund / Health Foundation / Nuffield Trust:** NHS performance data
- **National Audit Office (NAO):** Defence equipment plan affordability, departmental performance
- **Electoral Commission:** 2024 general election results
- **Academic literature:** Blanchard & Leigh (2013), Ramey (2019), Romer & Romer (2010), IMF Fiscal Monitor

All monetary figures are in GBP billions (2024-25 prices) unless otherwise stated. Data is accurate as of July 2024.
