-- CMS130 Patient-Level Results
-- Same CTEs as 02-cms130-measure.sql but outputs per-patient for verification
--
-- Usage: copy all CTEs from 02-cms130-measure.sql up to (and including)
-- measure_results, then replace the final SELECT with this one:

-- Per-patient results (for comparison with expected MeasureReports)
SELECT
    ap.patient_id,
    CASE WHEN ip.patient_id IS NOT NULL THEN 1 ELSE 0 END AS ip,
    CASE WHEN ip.patient_id IS NOT NULL THEN 1 ELSE 0 END AS den,
    CASE WHEN de.patient_id IS NOT NULL THEN 1 ELSE 0 END AS exc,
    CASE WHEN n.patient_id IS NOT NULL THEN 1 ELSE 0 END AS num
FROM (SELECT id AS patient_id FROM patient_flat) ap
LEFT JOIN initial_population ip ON ip.patient_id = ap.patient_id
LEFT JOIN denominator_exclusion de ON de.patient_id = ap.patient_id
LEFT JOIN numerator n ON n.patient_id = ap.patient_id
ORDER BY ap.patient_id;
