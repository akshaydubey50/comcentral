# Reporting and FX rules

This is the canonical definition of ComCentral's pay calculations. These rules describe current annual contractual base pay; they do not calculate payroll, tax or pay-equity conclusions.

## Population and pending salaries

Reports apply the selected employee filters to the full population before aggregation and use active employees by default. An imported employee with `salary=null` has no supplied pay amount:

- include the employee in filtered headcount and `salaryPendingCount`;
- exclude the employee from pay summaries, distribution bands, tenure pay statistics and outlier cohorts before calculation; and
- never substitute zero or infer an amount.

The pending count remains visible when approximate USD reporting is unavailable. A first salary assignment records `previousSalary=null` and then includes the employee in pay statistics.

## Money and summary statistics

Native-currency totals are never mixed. Salary values use Decimal arithmetic, never JavaScript `Number`. Round only displayed results, half-up to the currency precision.

For each applicable group, report headcount, total, minimum, maximum, mean, median, P25 and P75. Percentiles use R type 7: interpolate at zero-based position `(n - 1) * p`. Empty statistics are `null`, except count and total are zero. A singleton repeats its value for minimum, maximum, mean, median and percentiles.

## Distribution bands

Bands are descriptive ranges, not pay grades. The lower bound is inclusive and the upper bound is exclusive. Retain zero-count bands. Approximate USD mode uses the USD bands.

| Currency | Boundaries |
|---|---|
| USD, EUR, GBP, CAD, AUD, SGD, BRL | 0; 25,000; 50,000; 75,000; 100,000; 150,000; 200,000; infinity |
| INR | 0; 500,000; 1,000,000; 1,500,000; 2,000,000; 3,000,000; 5,000,000; infinity |
| JPY | 0; 3,000,000; 5,000,000; 7,000,000; 10,000,000; 15,000,000; 20,000,000; infinity |

## Tenure

Tenure is the number of completed calendar years at the visible UTC reporting date. A 29 February anniversary becomes 28 February in a non-leap year. Creation, import and edit reject a joining date in the future.

| Bucket | Completed years |
|---|---:|
| `<1` | Less than 1 |
| `1–<3` | At least 1 and less than 3 |
| `3–<5` | At least 3 and less than 5 |
| `5–<10` | At least 5 and less than 10 |
| `10+` | At least 10 |

## Outlier review

Build cohorts from country, native currency, job role and employment type inside the selected filters. A cohort requires at least 10 employees with recorded salaries. If its interquartile range is zero, do not evaluate it.

Calculate Q1, Q3 and IQR before rounding. Flag a salary only when it is strictly below `Q1 - 1.5 * IQR` or strictly above `Q3 + 1.5 * IQR`; equality with a fence is not a flag. Return at most 100 flag records together with the total flag count. Approximate USD mode does not change the native-currency cohorts. Flags are review aids, never automatic salary or pay-equity decisions.

## FX snapshots and conversion

Fetch rates daily from Frankfurter v2, pinned to ECB reference data. Store immutable snapshots containing the rate date, fetch timestamp, provider, checksum and all supported currency/rate pairs. Rates use the convention USD per one unit of source currency. Convert a complete result with one snapshot, aggregate before rounding, and never change native salaries.

Every snapshot read recomputes its SHA-256 identity from provider, rate date and supported currency/rate pairs in fixed currency order. A checksum mismatch makes conversion unavailable with `STALE` status and returns no rates. The checksum detects content mismatch; database permissions and immutability remain the enforcement boundary if both data and checksum are maliciously changed.

All supported currencies must be present with positive finite rates, unique codes, one consistent non-future rate date and complete coverage. Partial totals and a fallback rate of 1 are forbidden. No employee or salary data is sent to the provider. Concurrent refresh is idempotent by checksum, while provider revisions remain separate immutable snapshots.

| State | Rule | Reporting behavior |
|---|---|---|
| `FRESH` | Complete snapshot; latest successful validation no more than 36 hours old (falling back to snapshot fetch time when no validation attempt exists); reference date no more than 7 calendar days old | Approximate USD available with source and dates |
| `CACHED` | Latest successful validation is older than 36 hours (falling back to snapshot fetch time), or the latest refresh failed while the last good snapshot is still within the reference-date limit | Approximate USD remains available with a warning |
| `MISSING` | No snapshot exists | Approximate USD unavailable; native reporting remains available |
| `STALE` | Reference date is older than 7 calendar days, snapshot integrity fails, or current supported-currency coverage is incomplete | Approximate USD unavailable; native reporting remains available |

A refresh failure preserves the last good snapshot and records a safe failure status. The cron expression requests one daily invocation in the 21:00 UTC hour; provider timing and actual deployed execution require separate evidence. An authenticated manual retry is permitted.

Legacy snapshots containing exactly the original eight currencies keep their original checksum ordering and remain immutable. Because BRL is now supported, those snapshots cannot provide complete current USD reporting and produce an explicit refresh-required unavailable state. Newly fetched snapshots require all nine currencies.

## Sources

Sources checked on 2026-10-14: [Frankfurter](https://frankfurter.dev/), [ECB reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html), [NIST IQR fences](https://www.itl.nist.gov/div898/handbook/prc/section1/prc16.htm), and [R quantiles](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/quantile.html).

BRL coverage checked on 2026-10-15: [ECB BRL reference series](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-brl.en.html).
