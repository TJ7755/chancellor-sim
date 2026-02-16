# Historical Fiscal Precedents - UK Chancellor Simulation Research

## 1. NHS Budget Cuts and Freezes

### 1.1 Austerity Era NHS Spending (2010-2019)

| Period | Annual real growth | Historical average | Gap |
|--------|-------------------|-------------------|-----|
| 2010-2015 | 1.1% | 3.6% | -2.5pp |
| 2015-2019 | 1.6% | 3.6% | -2.0pp |
| Cumulative real growth 2010-2019 | ~15% total | ~42% at trend | ~£60bn shortfall |

**Key effects of below-trend NHS spending:**
- Waiting list growth: 2.5m (2010) → 4.4m (2019) → 7.6m (post-COVID 2024)
- A&E 4-hour target: Met consistently pre-2013 (95%+); dropped to ~74% by 2019
- Staff vacancy rates rose from ~2% to ~8% across NHS trusts
- Capital spending particularly squeezed: maintenance backlog grew from ~£4bn to ~£9bn (2019), reaching £11.6bn by 2024
- Agency staff spending rose from ~£2.5bn (2010) to ~£7bn (2019) as trusts struggled with permanent recruitment

### 1.2 NHS Workforce Impact
- Total NHS workforce grew ~15% (2010-19) but demand grew ~25% due to ageing, new treatments, population growth
- Nurse leavers rose steadily: ~33,000/year leaving in 2019 vs ~27,000 in 2010
- Junior doctor morale collapsed: BMA surveys showed >60% considering leaving profession
- GP numbers fell in absolute terms from ~36,000 FTE to ~34,000 despite rising patient numbers
- Consultants: vacancy rate rose from ~5% to ~10%

### 1.3 What "Cutting the NHS" Actually Means
The NHS has never faced an outright nominal spending cut in any single year. "Cuts" means:
1. **Real-terms freeze or below-inflation increase** (most common austerity tool)
2. **Efficiency target exceeding achievable savings** (the "Nicholson Challenge" of 4% annual efficiency -- widely seen as impossible beyond Year 2)
3. **Capital budget raid** (capital underspend transferred to revenue -- a common accounting trick that defers maintenance)
4. **Staff pay restraint** (1% pay cap 2011-2017; real-terms pay cuts of ~10% cumulative)

**Game calibration:**
- NHS funding below 2% real growth → waiting lists rise ~500k/year and A&E performance degrades
- NHS funding below 1% real growth → service quality noticeably deteriorates within 12-18 months
- NHS funding frozen in real terms → crisis conditions within 2 years (strikes, unsafe staffing, public outrage)
- NHS funding cut in real terms → political crisis within 6-12 months

### 1.4 Impact of Cost of Living Crisis on NHS Demand (2022-2024)
- Mental health referrals rose ~25-30% above pre-COVID baseline
- Cold-related illness admissions rose as families cut heating
- "Deprivation-sensitive" conditions (diabetes complications, respiratory disease) increased in most deprived areas
- "Delayed presentation" -- patients presenting later with more advanced conditions due to difficulty accessing GP appointments

---

## 2. Market Reactions to Fiscal Announcements

### 2.1 The Truss/Kwarteng Mini-Budget (23 September 2022) - Detailed Timeline

**Pre-announcement signals (August-September 2022):**
- Sterling already weakening (from ~$1.22 to ~$1.14) as Truss's fiscal plans became clear during leadership contest
- Gilt yields rising as market anticipated unfunded tax cuts
- IFS and Resolution Foundation publicly warning the plans didn't add up

**Day 0 (Friday 23 September):**
- 10-year gilt yield: opened ~3.5%, closed ~3.8% (+30bp in a day)
- 30-year gilt yield: +35bp
- Sterling: fell from ~$1.12 to ~$1.09

**Weekend 24-25 September:**
- International press coverage universally negative
- IMF issued extraordinary public rebuke (virtually unprecedented for a G7 country)
- US Treasury Secretary and Federal Reserve officials expressed concern

**Monday 26 September:**
- Sterling crashed to all-time low of $1.0350 in Asian trading
- 30-year gilt yield: spiked to 5.0% (from 3.7% pre-announcement)
- 5-year gilt yield: rose above 4.6%
- LDI (Liability-Driven Investment) crisis began: pension funds facing margin calls on leveraged gilt positions

**Tuesday 27 September:**
- BoE Governor Andrew Bailey issued statement (verbal intervention)
- Markets continued to deteriorate
- Several pension funds reported being hours from insolvency

**Wednesday 28 September:**
- Bank of England emergency intervention: announced unlimited gilt purchases for 13 days
- BoE committed to buying up to £65 billion in long-dated gilts
- 30-year yield fell ~100bp on the intervention day
- Sterling partially recovered

**Subsequent weeks:**
- Kwarteng reversed 45p tax rate abolition (3 October)
- Kwarteng sacked as Chancellor (14 October, after just 38 days)
- Jeremy Hunt appointed, reversed virtually all remaining measures
- Truss resigned (20 October, after 45 days as PM)
- Total gilt yield increase (peak vs pre-announcement): ~200bp on 30-year gilts
- Mortgages: average 2-year fixed rate rose from ~4.7% to ~6.5% within months
- Housing market: transactions fell ~20%; prices fell ~5% nationally

**Key lessons for game modeling:**
1. Markets price fiscal credibility, not just fiscal aggregates
2. The absence of OBR scrutiny was as damaging as the content of the announcements
3. The speed of crisis escalation was extraordinary (3 working days from announcement to BoE emergency intervention)
4. Leveraged positions in gilt market (LDI) created a non-linear amplification mechanism
5. Currency and gilt moves were correlated (unusual -- normally inversely related)
6. Political consequences were existential and near-immediate

### 2.2 Calibration Parameters for Market Reactions

| Scenario | 10-year gilt yield change | Sterling change | Speed |
|----------|--------------------------|-----------------|-------|
| Credible fiscal consolidation | -10 to -20bp | +1-2% | Gradual (weeks) |
| Modest unfunded expansion (0.5% GDP) with OBR | +5 to +15bp | -0.5% | Days |
| Significant unfunded expansion (1% GDP) with OBR | +15 to +30bp | -1-2% | Days |
| Major unfunded expansion (2% GDP) with OBR | +20 to +40bp | -2-3% | Days |
| Major unfunded expansion WITHOUT OBR | +50 to +150bp | -5-10% | Hours to days |
| Fiscal rule breach (acknowledged) | +15 to +25bp | -1% | Days |
| Fiscal rule breach (denied/obfuscated) | +40 to +80bp | -3-5% | Days |
| Credit rating downgrade (1 notch) | +10 to +20bp | -1-2% | Immediate |
| Abolishing/sidelining OBR | +50 to +100bp | -5% | Immediate |
| Truss-style scenario (unfunded + no OBR + credibility collapse) | +150 to +250bp | -10-15% | Hours |

### 2.3 Historical Gilt Yield Reactions to Budgets (Pre-Truss)

Most UK budgets produce gilt yield movements of **less than 10bp** -- they are largely pre-briefed, OBR-scored, and incrementalist. Notable exceptions:

- **2008 Pre-Budget Report (Darling):** Announced massive fiscal stimulus and £118bn borrowing forecast. Gilt yields rose ~15bp on announcement but markets were broadly accepting given the financial crisis context.
- **2010 Emergency Budget (Osborne):** Aggressive austerity plan. Gilt yields fell ~8bp; sterling rose modestly. Markets rewarded fiscal discipline.
- **2012 Budget (Osborne):** "Omnishambles budget." Minimal gilt market reaction (~5bp) because the controversy was about distribution, not fiscal aggregates.
- **2017 Autumn Budget (Hammond):** OBR growth downgrade. Gilt yields rose ~5bp; minimal drama.
- **2020 March Budget (Sunak):** Massive COVID fiscal response. Gilt yields initially rose but the BoE's simultaneous QE expansion kept them suppressed.

**Key insight:** Pre-Truss, UK fiscal events almost never moved gilt yields by more than 15bp because the institutional framework (OBR, Bank of England, Treasury conventions) provided credibility anchors. The Truss episode showed what happens when those anchors are removed.

### 2.4 Sterling Crisis Precedents

**1976 IMF Crisis:**
- Sterling fell from $2.00 to $1.57 (-21%)
- Government forced to request IMF loan (£2.3 billion)
- IMF imposed spending cuts and monetary targets
- Politically humiliating for the Callaghan government
- Led to "Winter of Discontent" (1978-79) and contributed to Thatcher's election

**1992 Black Wednesday (ERM Exit):**
- BoE raised rates from 10% to 12%, then announced 15% (never implemented)
- Spent ~£3.3 billion of reserves defending sterling
- Sterling fell from DM 2.78 to ~DM 2.50 (-10%)
- Political credibility of Conservatives on economic management destroyed
- Paradoxically, the economy performed well after ERM exit (lower rates, competitive sterling)

**2016 Brexit Referendum:**
- Sterling fell from ~$1.50 to ~$1.32 overnight (-12%)
- But gilt yields fell (flight to safety)
- FTSE 100 initially fell 5% then recovered within weeks (weaker sterling boosted international earners)
- UK avoided recession but growth slowed

**Game calibration:** Sterling crises of >5% are very rare and require major credibility shocks. A 10%+ fall is crisis territory and triggers consumer price inflation (every 10% sterling depreciation adds approximately 1.5-2pp to CPI over 12-18 months through import price pass-through).

---

## 3. Public Sector Strikes

### 3.1 The "Winter of Discontent" (1978-79)

| Sector | Duration | Workers | Key demands |
|--------|----------|---------|-------------|
| Ford workers | 9 weeks | 57,000 | 17% pay rise (settled at 17%) |
| Lorry drivers | ~2 weeks | 80,000 | 20%+ pay rise |
| Local authority workers (NUPE) | Rolling strikes, weeks | 1.5 million | Flat £60/week minimum |
| NHS ancillary staff | Rolling | Various | Pay parity |
| Grave diggers (Liverpool, Tameside) | 2-3 weeks | ~500 | Pay claim |
| Refuse collectors | 3-4 weeks | Thousands | Pay claim |

**Political impact:** Destroyed the Callaghan government. Callaghan's (misreported) "Crisis? What crisis?" became iconic. Images of uncollected rubbish, unburied dead, and hospital picket lines dominated media. Directly led to Thatcher's election in May 1979.

**Game calibration:** A "Winter of Discontent"-style multi-sector strike wave requires: (a) sustained real wage cuts across public sector (>3% cumulative), (b) government perceived as rigid/uncaring, (c) union coordination across sectors.

### 3.2 Austerity-Era Strikes (2010-2019)

| Year | Sector | Issue | Days lost | Scale |
|------|--------|-------|-----------|-------|
| 2011 | Public sector (wide) | Pension reform | 1.4m working days (largest since 1926) | 2m+ workers |
| 2014 | NHS (some trusts) | Pay restraint | Modest | First NHS strikes in 30+ years |
| 2016 | Junior doctors (BMA) | New contract imposition | 6 days of action | 45,000 doctors |
| 2016 | Southern Rail | Driver-only operation | Ongoing for months | Network paralysis |
| 2019 | Universities (UCU) | Pensions, pay, conditions | 14 days | 43,000 lecturers |

### 3.3 The 2022-2023 Strike Wave

The most significant period of industrial action since the 1980s:

| Sector | Union | Duration | Workers | Key demands |
|--------|-------|----------|---------|-------------|
| Rail (Network Rail) | RMT | 14 strike days over 6+ months | 40,000 | 7%+ pay, no compulsory redundancies, no roster changes |
| Rail (train operators) | ASLEF | 12+ strike days | 22,000 | Pay rise matching inflation |
| Royal Mail | CWU | 18 strike days | 115,000 | Pay rise, against restructuring |
| NHS nurses | RCN | 2 days Dec 2022, 2 days Jan/Feb 2023 | 300,000 balloted | 19% claim (inflation + real restoration) |
| Junior doctors | BMA | 12+ days across multiple months | 50,000 | 35% "pay restoration" |
| Ambulance workers | GMB/Unison/Unite | 4 days | 25,000 | Pay rise matching inflation |
| Teachers (England) | NEU | 1 day national + regional | 300,000 | 12% claim |
| Civil servants (PCS) | PCS | Multiple days, selective | 100,000+ | Pay, conditions |
| University lecturers | UCU | 18 days | 70,000 | Pay, pensions, conditions |
| Firefighters | FBU | Balloted, settled | 33,000 | Pay |
| Airport security, Border Force | Various | 8 days over Christmas 2022 | 1,000+ | Pay, conditions |

**Total working days lost 2022:** ~2.5 million (highest since 1989)
**Total working days lost 2023:** ~1.5 million

**Key settlement outcomes:**
- Rail: Eventually settled at ~5% over 2 years (below inflation -- unions accepted less than demanded)
- NHS nurses: 6% + one-off payment (~6.5% total equivalent). Below the 19% claim but above initial government offer.
- Junior doctors: 22% over 2 years (partial pay restoration). The longest and most disruptive NHS strikes in history.
- Teachers: 6.5% for 2023-24
- Civil servants: ~4.5-5%

**Game calibration:**

Strike probability by sector given real pay conditions:

| Condition | Rail | Teachers | Nurses | Civil servants | Doctors |
|-----------|------|----------|--------|----------------|---------|
| Real pay cut 1-3% | 60% | 30% | 10% | 25% | 20% |
| Real pay cut 3-5% | 85% | 55% | 30% | 45% | 50% |
| Real pay cut >5% | 95% | 75% | 60% | 65% | 80% |
| 2+ years cumulative decline | Add +20% | Add +20% | Add +20% | Add +20% | Add +20% |
| Real pay increase matching inflation | 10% | 2% | 1% | 5% | 5% |

**Key factors modifying strike probability:**
- NHS staff are very reluctant to strike (professional ethos, patient safety concerns). Nurses striking is historically extraordinary -- it took 10+ years of real pay erosion. Nurse strikes are politically devastating for the government.
- Rail unions (RMT, ASLEF) have the lowest strike threshold and most experienced strike infrastructure. Rail strikes are routine and politically less costly per incident.
- Teacher strikes are moderately costly politically (parents affected) but teachers have strong public sympathy
- Junior doctor strikes are the most disruptive per striker (irreplaceable skills, cancellation of surgeries)

### 3.4 Political Impact Calculation

**Public sympathy factors:**
- Strikes by NHS workers generate the most public sympathy (~55-65% support in polls)
- Rail strikes generate the least (~30-40% support)
- Teacher strikes are intermediate (~45-55% support)
- Fire/ambulance strikes generate very high sympathy (~60-70%)

**Government approval impact:**
- A major strike wave (3+ sectors simultaneously) costs approximately 3-8 approval points
- This is amplified if the government is seen as intransigent or if there are visible consequences (cancelled surgeries, school closures, transport chaos)
- The impact decays with a half-life of roughly 3-6 months IF the strikes are resolved; if they persist, the damage compounds

---

## 4. Consequences of Austerity Spending Cuts

### 4.1 NHS Quality Indicators During Funding Squeezes

| Indicator | 2010 level | 2019 level (pre-COVID) | 2024 level |
|-----------|-----------|------------------------|------------|
| Elective waiting list | 2.5m | 4.4m | 7.6m |
| A&E 4-hour target met | 95%+ | 79% | ~74% |
| Cancer 62-day target met | 85% | 77% | ~67% |
| Ambulance Cat 1 mean response | 7 min | 7.2 min | 8.5 min |
| Bed occupancy rate | 85% | 90%+ | 94% (dangerously high) |
| Delayed discharges per day | ~3,000 | ~4,500 | ~13,000 |
| Staff vacancies | ~25,000 | ~100,000 | ~112,000 |
| Agency spending | ~£2.5bn | ~£7bn | ~£10bn |
| Maintenance backlog | ~£4bn | ~£9bn | ~£11.6bn |

### 4.2 Local Government -- Effects of Austerity

Central government funding to local councils cut by ~50% in real terms (2010-2020):

- **Revenue spending power** per dwelling fell by approximately 29% in real terms nationally between 2010 and 2020, with the most deprived areas cut most (up to 40%)
- **Libraries:** 800+ libraries closed (nearly 20% of the total). Opening hours reduced by ~30% at surviving libraries
- **Children's centres:** ~1,000 Sure Start centres closed (from ~3,600 to ~2,600 by 2019)
- **Youth services:** Real-terms spending cut by ~70% between 2010 and 2019. ~760 youth centres closed
- **Social care:** Despite rising demand, adult social care spending fell ~3% in real terms 2010-2016, creating the "bed blocking" crisis
- **Planning:** Planning departments lost ~40% of staff. Average planning decision time increased from 9 weeks to 14 weeks
- **Roads maintenance:** Pothole complaints tripled. The RAC estimated the cost of road repair backlog reached approximately £12 billion by 2019

**Game calibration:** Local government cuts create delayed but severe feedback effects: (a) reduced social care increases NHS pressure, (b) reduced youth services correlate with youth crime rises (with ~2-3 year lag), (c) infrastructure deterioration compounds over time.

### 4.3 Impact on Police Numbers

- Police officer numbers: 143,734 (March 2010) → 122,404 (March 2018) -- reduction of 21,330 officers (14.8%)
- PCSOs: ~16,000 → ~10,000
- Police staff (civilian) cut by approximately 18,000
- Total police workforce: ~244,000 → ~200,000
- Knife crime rose approximately 80% between 2014 and 2019
- Homicides: 551 (2014-15) → 726 (2017-18)
- Charge rates for burglary fell from ~10% to ~4%
- Boris Johnson pledged to recruit 20,000 new officers in 2019 -- effectively reversing the cuts

### 4.4 Impact on Court System

- **Courts closed:** 258 courts closed between 2010 and 2019 (nearly half the estate)
- **Crown Court backlog:** ~34,000 → ~39,000 (2010-2019), then ~67,000 during COVID
- **Legal aid:** Spending cut from £2.2bn to £1.6bn in real terms. LASPO removed legal aid for ~650,000 cases/year

### 4.5 Impact on Defence Readiness

- Regular armed forces personnel: ~178,000 (2010) → ~144,000 (2019)
- Army: 102,000 → ~78,000
- Equipment programme had ~£7-17bn unfunded gap (NAO estimates)
- Capability gaps: insufficient maritime patrol aircraft (2010-2020), reduced surface fleet, reduced armoured capability

### 4.6 Impact on Benefit Claimants

Key welfare reforms and effects:
- **Bedroom tax** (2013): Affected ~660,000 households, average loss ~£14/week
- **Universal Credit** 5-week standard wait: forced claimants to food banks
- **Benefit cap** (2013, reduced 2016): Affected ~67,000 households
- **ESA reassessments:** ~2,380 people died within 6 weeks of being found "fit for work" (2011-2014)
- **Sanctions regime:** ~1 million JSA sanctions in 2013-14 alone

### 4.7 Political Consequences of Austerity

- **2015:** Conservatives gained seats (306 → 330). "Economic competence" narrative worked.
- **2017:** May lost majority. Public beginning to feel austerity.
- **2019:** Johnson won 80-seat majority on Brexit, but pledged to "end austerity"
- **2024:** Conservative wipeout (worst result in history). Accumulated public services degradation a major factor.

**Game calibration:** Austerity can be electorally viable for 1-2 terms IF: (a) opposition is weak, (b) economy is growing, (c) credible narrative exists, (d) pain concentrated on groups less likely to vote. But creates compounding electoral liability after 10+ years.

### 4.8 Capital Spending Cut Timeline

- **Year 1-2:** Mostly invisible. Maintenance deferred.
- **Year 3-5:** Physical deterioration begins. Potholes, leaking roofs, delayed replacements.
- **Year 5-10:** Compounding effect. Cost escalates non-linearly (NHS maintenance backlog tripled from ~£4bn to ~£11.6bn)
- **Year 10+:** System-level failures. RAAC concrete crisis was a direct delayed consequence.

**Multiplier effect:** Every £1 of deferred maintenance costs approximately £2.50-4.00 to fix later.

### 4.9 Homelessness, Rough Sleeping, and Food Banks

| Indicator | 2010 level | Peak pre-COVID | Change |
|-----------|-----------|---------------|--------|
| Rough sleeping (England) | 1,768 | 4,751 (2017) | +169% |
| Statutory homelessness | ~90,000 | ~140,000 (2019) | +56% |
| Temporary accommodation | 48,010 | 84,740 (2019) | +76% |
| Food bank parcels (Trussell Trust) | 61,468 | 1,900,000 (2019-20) | +2,993% |
| Children in poverty (AHC) | 3.5m | 4.2m (2019-20) | +700,000 |

---

## 5. Media Reaction Patterns

### 5.1 Newspaper Reactions to Fiscal Policies

**Tax rises on high earners (50p/45p rate):**
- Telegraph, Times, Mail: Strongly opposed ("brain drain," "punishing success")
- Guardian, Mirror, Independent: Supportive ("fair share")
- FT: Nuanced, sceptical of very high rates
- Public polling: 60-70% support higher taxes on "the rich"

**Tax rises on businesses:**
- Right-wing press: Strongly opposed ("jobs killer")
- Left-wing press: Supportive ("fair share")
- Public polling: ~55-60% moderately supportive

**Tax rises on "working people" (income tax, NI, VAT):**
- **Universal opposition across all newspapers.** Most politically toxic category.
- The "tax lock" has become near-mandatory since 2015

**NHS spending increases:**
- All newspapers generally positive. No newspaper has ever editorially opposed an NHS funding increase.

**Defence spending cuts:**
- Telegraph, Mail, Sun: Strongly opposed. Post-Ukraine, cross-party pressure to increase.
- Guardian, Mirror: Muted since Ukraine invasion

**Welfare cuts:**
- Telegraph, Mail, Sun, Express: Strongly supportive ("scroungers," "dependency")
- Guardian, Mirror, Independent: Strongly opposed ("cruelty")
- Public: Deeply split (~50% "too generous" vs ~30% "not enough")

**Breaking manifesto pledges:**
- Universally damaging across all outlets regardless of direction
- Game calibration: costs approximately 3-8 approval points, semi-permanent

### 5.2 Budget Coverage Lifecycle

- **Day 0:** Initial reaction, pre-briefed highlights dominate
- **Day 1-2:** Detailed analysis, think tanks publish
- **Day 3-5:** IFS post-budget briefing -- often sets definitive narrative
- **Week 2:** Coverage fades unless specific controversial measure persists
- **Weeks 3-4:** Largely forgotten unless market crisis or betrayal narrative
- **Exception:** Market crisis or clear betrayal narrative can persist for months

**Half-life of budget coverage:** ~3-5 days normally, ~10 days if IFS verdict is devastating

### 5.3 Role of the IFS

- IFS Post-Budget Briefing is the most influential single event outside the Budget itself
- Key phrases: "The numbers don't add up," "This means tax rises later," "Spending plans unrealistically tight"
- If IFS says credible: coverage calms within ~3 days
- If IFS says not credible: coverage intensifies for ~2 weeks, political damage persists months
- Game calibration: IFS acts as "credibility check." Unrealistic plans trigger 2-5 point approval hit and potential gilt reaction.

---

## 6. Tax Change Precedents

### 6.1 VAT Rise 17.5% to 20% (January 2011)

- Direct CPI impact: +0.7-0.8pp (CPI rose to 4.4% in Feb 2011)
- Revenue: ~£13bn/year additional, broadly as expected
- Consumer confidence: GfK fell from -21 to -29
- Distributional: Regressive (poorest quintile pays ~5.4% of income, richest ~3.1%)
- Political damage: Limited, absorbed into broader austerity narrative

**Game calibration:** Each 1pp VAT rise:
- Adds ~0.4-0.5pp to CPI directly
- Raises ~£7.5bn (before behavioural effects)
- Reduces GDP by ~0.05pp in first year
- Costs 1-2 approval points

### 6.2 Top Rate Cut 50p to 45p (April 2013)

- HMRC evidence: 50p rate raised only ~£1bn (not £2.5-3bn expected) due to forestalling/avoidance
- Counter-evidence: IFS argued settled revenue would have been £2-2.5bn
- Political impact: Extremely damaging. "Millionaire's tax cut" narrative devastating.
- Same budget as "granny tax" and "pasty tax" → "omnishambles budget"

**Game calibration:** Cutting top rate costs 2-5 approval points immediately, provides permanent opposition attack line. Political cost far exceeds any economic benefit.

### 6.3 Laffer Curve Evidence for UK

| Tax | Revenue-maximising combined rate | Evidence quality |
|-----|--------------------------------|-----------------|
| Income tax (top, combined IT+NI) | 54-60% | Moderate |
| Combined basic rate (IT+NI) | ~70%+ | Weak |
| Corporation tax | 25-33% | Moderate-strong |
| Capital gains tax | 25-35% | Moderate |

Current combined top marginal rate at £100k-£125,140 is effectively 60% (due to PA withdrawal).

### 6.4 Corporation Tax Cut 28% to 19% (2010-2017)

- Revenue increased despite rate cut (£43bn → £56bn) due to recovering economy and base-broadening
- But IFS estimated the cut itself reduced revenue by ~£16bn/year vs counterfactual
- Business investment remained weak throughout
- Game calibration: ~£3.2bn revenue per 1pp. Buys good business headlines but minimal GDP impact.

### 6.5 National Insurance Rise and Reversal (2022-2024)

- 1.25pp NI rise (April 2022): ~£12bn/year revenue. Broke manifesto pledge. 55-60% opposition.
- Reversed by Truss (November 2022)
- Sunak/Hunt cut employee NI from 12% → 10% → 8% (2024): ~£20bn/year foregone
- **Key lesson:** The NI cuts had strikingly little political benefit -- voters didn't notice due to fiscal drag from frozen thresholds

**Game calibration:** A 1pp NI rise costs ~4 approval points; a 1pp NI cut gains only ~1-2 points (loss aversion asymmetry).

### 6.6 Fiscal Drag (Frozen Thresholds)

- Revenue raised: ~£6bn/year in 2024-25, rising to £7-8bn by 2027-28. Cumulative: ~£40-50bn
- ~4 million additional income taxpayers, ~1.3 million additional higher-rate payers
- Average cost to median earner: ~£400/year
- IFS called it "a bigger tax increase than any explicit tax rise since 1979"
- Public awareness: ~40% correctly identified it as a tax rise by 2024 (up from ~15% in 2022)

**Game calibration:** Raises revenue of ~(wage growth rate × 0.8 × current IT revenue)/year. Costs ~0.5-1 approval points/year. Most revenue-efficient tool but compounds and can trigger backlash.

---

## 7. Summary Calibration Tables

### Approval Rating Impacts

| Event | Immediate change (points) | Decay half-life |
|-------|--------------------------|-----------------|
| NHS real-terms spending cut | -2 to -5/year (cumulative) | Permanent |
| NHS real-terms increase above 3% | +1 to +3 | 6 months |
| Tax rise on high earners | -1 to -3 | 3 months |
| Tax rise on "working people" | -3 to -8 | 6-12 months |
| Tax cut (any) | +1 to +3 | 1-2 months |
| Breaking manifesto pledge | -3 to -8 | Semi-permanent |
| Major strike wave (>1 month) | -3 to -8 | 3-6 months |
| Market crisis (Truss-style) | -10 to -20 | 12-18 months |
| Visible infrastructure failure | -2 to -5 per incident | 2-4 weeks |
| Rising crime (visible) | -1 to -3/year | Cumulative |
| Falling unemployment (per 1pp) | +1 to +2 | 3-6 months |
| Rising NHS waiting lists | -1 to -3 per million | Permanent |
| IFS "numbers don't add up" | -2 to -5 | 2-4 weeks |

### Market Reaction Parameters

| Event | Gilt yield (bp) | Sterling (%) | Duration |
|-------|----------------|--------------|----------|
| Credible consolidation | -10 to -20 | +1% | Permanent |
| Modest unfunded expansion (0.5% GDP) with OBR | +5 to +15 | -0.5% | 2-4 weeks |
| Major unfunded expansion (2% GDP) with OBR | +20 to +40 | -2 to -3% | 4-8 weeks |
| Major unfunded WITHOUT OBR | +50 to +150 | -5 to -10% | Until reversed |
| Fiscal rule breach (minor) | +15 to +25 | -1% | 2-4 weeks |
| Fiscal rule breach (major) | +40 to +80 | -3 to -5% | Until new framework |
| Abolishing OBR | +50 to +100 | -5% | Permanent |
| Credit rating downgrade | +10 to +20 | -1 to -2% | Permanent |

### Strike Probability Parameters

| Condition | Rail | Teachers | Nurses | Civil servants |
|-----------|------|----------|--------|----------------|
| Real pay cut 1-3% | 60% | 30% | 10% | 25% |
| Real pay cut 3-5% | 85% | 55% | 30% | 45% |
| Real pay cut >5% | 95% | 75% | 60% | 65% |
| 2+ years cumulative decline | Add +20% all | | | |
| Real pay increase = inflation | 10% | 2% | 1% | 5% |

---

*Sources: ONS, OBR, IFS, Bank of England, King's Fund, Health Foundation, NAO, HMRC, BMA, RCN*
*Data reflects published statistics through early 2025*
*Key insight: Fiscal decisions compound over time with non-linear path dependence. A 5-year NHS squeeze produces ~8-10x the damage of a 1-year squeeze due to system degradation, staff attrition, and maintenance backlog compounding.*
