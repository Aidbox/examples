"""Parse patients.csv, build validated US Core profiles, write a transaction Bundle."""

import csv
import json
import uuid
import warnings

from fhir_types.hl7_fhir_r4_core import (
    Identifier,
    HumanName,
    Reference,
    Patient,
    Observation,
    Bundle,
    BundleEntry,
    BundleEntryRequest,
)

from fhir_types.hl7_fhir_us_core.profiles import (
    UscorePatientProfile,
    UscoreBloodPressureProfile,
)

# Pydantic warns when an extension list holds plain dicts rather than Extension
# instances — expected with the current flat-dict extension plumbing.
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")


def row_to_patient(row: dict[str, str]) -> UscorePatientProfile:
    base_patient = Patient(
        resource_type="Patient",
        identifier=[
            Identifier(system="http://hospital.example.org/mrn", value=row["mrn"])
        ],
        name=[HumanName(family=row["family"], given=[row["given"]])],
        gender=row["gender"],  # Literal-typed; Pydantic validates the value
        birth_date=row["birthDate"],  # snake_case attr; serializes back to "birthDate"
    )

    patient = UscorePatientProfile.apply(base_patient)
    patient.set_race(
        {
            "ombCategory": {
                "system": "urn:oid:2.16.840.1.113883.6.238",
                "code": row["raceCode"],
                "display": row["raceDisplay"],
            },
            "text": row["raceDisplay"],
        }
    )
    return patient


def row_to_bp(row: dict[str, str], patient_urn: str) -> UscoreBloodPressureProfile:
    bp = UscoreBloodPressureProfile.create(
        status="final",
        subject=Reference(reference=patient_urn),
    )

    (
        bp.set_effective_date_time(row["effectiveDateTime"])
        .set_systolic(
            {
                "value": float(row["systolic"]),
                "unit": "mmHg",
                "system": "http://unitsofmeasure.org",
                "code": "mm[Hg]",
            }
        )
        .set_diastolic(
            {
                "value": float(row["diastolic"]),
                "unit": "mmHg",
                "system": "http://unitsofmeasure.org",
                "code": "mm[Hg]",
            }
        )
    )

    errors = bp.validate()["errors"]
    if errors:
        raise ValueError(f"{row['mrn']}: {'; '.join(errors)}")
    return bp


def row_to_entries(row: dict[str, str]) -> list[BundleEntry[Patient | Observation]]:
    patient_urn = f"urn:uuid:{uuid.uuid4()}"
    patient = row_to_patient(row)
    bp = row_to_bp(row, patient_urn)

    return [
        BundleEntry(
            full_url=patient_urn,
            resource=patient.to_resource(),
            request=BundleEntryRequest(method="POST", url="Patient"),
        ),
        BundleEntry(
            full_url=f"urn:uuid:{uuid.uuid4()}",
            resource=bp.to_resource(),
            request=BundleEntryRequest(method="POST", url="Observation"),
        ),
    ]


def main() -> None:
    with open("patients.csv") as f:
        rows = list(csv.DictReader(f))
    print(f"Loaded {len(rows)} rows")

    bundle = Bundle[Patient | Observation](
        resource_type="Bundle",
        type="transaction",
        entry=[entry for row in rows for entry in row_to_entries(row)],
    )

    with open("bundle.json", "w") as f:
        json.dump(bundle.model_dump(by_alias=True, exclude_none=True), f, indent=2)
    entries = bundle.entry
    if entries is None:
        raise ValueError("entries is None")
    print(f"Wrote bundle with {len(entries)} entries")


if __name__ == "__main__":
    main()
