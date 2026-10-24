---
name: lead-gen-pipeline
description: "Design or analyze a local-service lead funnel from source attribution through qualification and closed-sale outcomes. Use for lead quality, conversion, and ROI questions."
version: 0.1.0
metadata:
  type: workflow
  lifecycle: draft
---

# Lead Gen Pipeline

This skill supports funnel design and evidence-based reporting. It does not operate a CRM, contact leads, send nurture messages, or persist personal data.

## Define the measurement

1. Set the site/business, service area, reporting period, funnel stages, and decision the analysis should support. Define each stage and its timestamp before calculating rates.
2. Inventory available evidence: first-party landing/page events, captured referrer and UTM values, self-reported source, CRM stage history, closed-sale records, and marketing-cost records. Record provenance, coverage, and gaps.
3. Keep observed and inferred attribution separate. A captured UTM/referrer or a person's answer is observed evidence. A search keyword is inferred unless a verified dataset explicitly supplies it. Do not turn “organic” into a specific query without evidence.
4. Establish deduplication rules using an available stable lead identifier. Document repeat submissions, merged records, test/spam exclusions, status changes, and missing timestamps. Never deduplicate on guesswork alone.

## Analyze the funnel

For each defined stage, report eligible lead count, reached count, and the time cohort used. Calculate a stage rate only when its denominator is known and nonzero; otherwise report `unknown` or `not applicable`, not zero or 100%. Keep late-arriving conversions and cohort maturity visible.

Report closed-sale revenue only when linked to a source record and clearly state whether it is booked, collected, gross, or net. Define marketing-cost scope and period before calculating cost per acquisition or ROI. If attribution, revenue linkage, cost scope, or currency is incomplete, show the gap and do not present a precise ROI.

Possible metrics, when the underlying data supports them:

- Contact rate = leads contacted / eligible leads
- Quote rate = leads quoted / eligible leads
- Booking rate = leads booked / eligible leads
- Close rate = closed leads / eligible leads
- Cost per acquisition = in-scope marketing cost / attributable closed leads
- ROI = (attributable revenue − in-scope cost) / in-scope cost

State numerator, denominator, cohort, date range, and data source next to each result. Averages can hide service-area, channel, or cohort differences; segment only where sample size and data quality support it.

## Recommend changes

Identify the funnel stage with the strongest supported evidence of friction. Separate observed bottlenecks from hypotheses. Recommend a test with one clear change, a comparison period or control, success metric, guardrails, and owner. Do not assert a universal response-time or sales benchmark without a relevant source.

## Output

Summarize scope and data coverage; stage definitions; observed source versus inferred attribution; deduplication and cohort rules; funnel counts and supported rates; revenue/cost definitions; unknowns; findings; and proposed next test. Do not include names, phone numbers, email addresses, or property-level personal data in a report unless strictly needed and explicitly authorized.

## Boundaries

- Do not contact leads, send email/SMS, start nurture, change routing, or update a CRM as part of this analysis.
- Do not write personal data to memory, a vault, or a skill library.
- Do not claim revenue or ROI from traffic, form fills, list prices, or unattributed totals.
- If the available records cannot support a metric, label it unavailable and explain the missing evidence.
