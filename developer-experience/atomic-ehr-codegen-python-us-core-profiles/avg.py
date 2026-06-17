"""Read bundle.json back, select US Core Blood Pressure observations, print average BP."""

import json

from fhir_types.hl7_fhir_r4_core.observation import Observation
from fhir_types.hl7_fhir_us_core.profiles import UscoreBloodPressureProfile


def is_us_core_bp(resource: dict) -> bool:
    # Python profiles have no `is()` type guard (unlike the TS API); select on
    # resourceType + meta.profile, then hand the survivors to from_resource().
    return resource.get(
        "resourceType"
    ) == "Observation" and UscoreBloodPressureProfile.canonical_url in (
        resource.get("meta", {}).get("profile") or []
    )


def main() -> None:
    with open("bundle.json") as f:
        bundle = json.load(f)

    bps = [
        UscoreBloodPressureProfile.from_resource(
            Observation.model_validate(entry["resource"])
        )
        for entry in bundle.get("entry", [])
        if is_us_core_bp(entry["resource"])
    ]

    def avg(xs: list[float]) -> float:
        return sum(xs) / len(xs)

    systolic = [
        systolic["value"] for bp in bps if (systolic := bp.get_systolic()) is not None
    ]
    diastolic = [
        diastolic["value"]
        for bp in bps
        if (diastolic := bp.get_diastolic()) is not None
    ]

    print(f"Avg BP: {avg(systolic):.1f}/{avg(diastolic):.1f} mmHg (n={len(bps)})")


if __name__ == "__main__":
    main()
