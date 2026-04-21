# 10-minute install verification

Copy-paste curl checklist to confirm `Measure/$evaluate-measure` is correctly installed. Works for both Mode A (bundled docker-compose) and Mode B (existing Aidbox).

Set your target first:

```bash
# Mode A (our docker-compose): Aidbox on :8888, root:secret
export AIDBOX=http://localhost:8888
export AUTH="-u root:secret"

# Mode B (your Aidbox): substitute your URL + credentials
# export AIDBOX=https://aidbox.example.com
# export AUTH="-u <admin>:<password>"
```

## Step 1 — Aidbox is reachable

```bash
curl -s $AIDBOX/health | grep -q '"status":"pass"' && echo "✓ Aidbox up" || echo "✗ Aidbox unreachable"
```

Expected: `✓ Aidbox up`.

## Step 2 — Operation is registered

```bash
curl -s $AUTH $AIDBOX/App/com.sql.evaluate.app -o /tmp/app.json -w "%{http_code}\n"
```

Expected: `200`. If `404` — the App resource isn't registered (re-run init-bundle for Mode A, or `PUT /App/com.sql.evaluate.app` per `install-to-existing-aidbox.md` Step 2 for Mode B).

## Step 3 — Shared views exist

```bash
curl -s $AUTH -X POST $AIDBOX/\$sql \
  -H 'Content-Type: application/json' \
  -d '["SELECT count(*) AS patient_flat_rows FROM patient_flat"]'
```

Expected: `[{"patient_flat_rows": <your actual Patient count>}]`.

If error `"relation 'patient_flat' does not exist"` — shared views didn't get created. Re-run `python3 setup.py` (Mode A) or `python3 setup.py --skip-clinical` (Mode B).

## Step 4 — Terminology is loaded

```bash
curl -s $AUTH -X POST $AIDBOX/\$sql \
  -H 'Content-Type: application/json' \
  -d '["SELECT COUNT(DISTINCT valueset_url) AS vs, COUNT(*) AS codes FROM concepts"]'
```

Expected: `[{"vs": 104, "codes": 9651}]`.

If `codes` is significantly lower — a `setup.py` step failed partway. Re-run (idempotent).

## Step 5 — End-to-end evaluation

Pick any patient ID you know exists in your Aidbox (for Mode A use `007ec5f1-08cf-474a-a472-f6a92cca4b79`):

```bash
PID=<your-patient-id>

curl -s $AUTH -X POST \
  "$AIDBOX/Measure/\$evaluate-measure?measure=cms130&subject=Patient/$PID&reportType=subject&periodStart=2024-01-01&periodEnd=2024-12-31" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('resourceType') == 'MeasureReport':
    pops = {p['code']['coding'][0]['code']: p.get('count', 0)
            for g in d.get('group', []) for p in g.get('population', [])}
    score = next((g.get('measureScore',{}).get('value') for g in d.get('group',[]) if g.get('measureScore')), '-')
    print(f'✓ MeasureReport returned')
    print(f'  IP={pops.get(\"initial-population\",\"?\")} Den={pops.get(\"denominator\",\"?\")} Exc={pops.get(\"denominator-exclusion\",\"?\")} Num={pops.get(\"numerator\",\"?\")} score={score}')
    refs = [r.get('reference') for r in d.get('evaluatedResource', []) if r.get('reference')]
    print(f'  {len(refs)} evaluatedResource references')
else:
    print(f'✗ Got {d.get(\"resourceType\")}: {(d.get(\"issue\",[{}])[0] or {}).get(\"diagnostics\",\"unknown\")[:200]}')
"
```

Expected: a `MeasureReport` with four population counts and at least one `evaluatedResource` reference. `IP=0` is not an error — it means the picked patient doesn't meet the initial-population criteria for CMS130 (age 50–74, an office-visit encounter in the measurement period).

## Step 6 — Population-level report

```bash
curl -s $AUTH -X POST \
  "$AIDBOX/Measure/\$evaluate-measure?measure=cms130&reportType=population&periodStart=2024-01-01&periodEnd=2024-12-31" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
pops = {p['code']['coding'][0]['code']: p.get('count', 0)
        for g in d.get('group', []) for p in g.get('population', [])}
score = next((g.get('measureScore',{}).get('value') for g in d.get('group',[]) if g.get('measureScore')), '-')
print(f'CMS130 population: IP={pops.get(\"initial-population\")} Den={pops.get(\"denominator\")} Exc={pops.get(\"denominator-exclusion\")} Num={pops.get(\"numerator\")} score={score}')
"
```

Expected:
- **Mode A** on sample data: `IP=204 Den=204 Exc=80 Num=8 score=0.0645`
- **Mode B** on your data: any numbers — `IP > 0` means shared views correctly flatten your FHIR data against the measure's criteria.

## Step 7 — All 12 measures don't error out

```bash
for M in cms75 cms124 cms125 cms130 cms131 cms139 cms143 cms149 cms153 cms155 cms165 cms1154; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" $AUTH -X POST \
    "$AIDBOX/Measure/\$evaluate-measure?measure=$M&reportType=population&periodStart=2024-01-01&periodEnd=2024-12-31")
  printf "  %-10s HTTP=%s\n" "$M" "$HTTP"
  sleep 1
done
```

Expected: all 12 return `HTTP=200`. Transient `500`s on rapid calls are a known Flask dev-server issue — re-run the single failing measure after 1-2 seconds. For production install, run the app under gunicorn/waitress.

---

If all 7 steps pass, installation is verified. You can start calling `Measure/$evaluate-measure` from your application.

If any step fails, check `install-to-existing-aidbox.md` § Troubleshooting for the most common causes, or re-run the corresponding setup step (everything is idempotent).
