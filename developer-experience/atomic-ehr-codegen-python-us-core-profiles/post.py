"""Optional: persist the generated US Core resources to a FHIR server with fhirpy.

Run `python load.py` first to write bundle.json, then point this at any FHIR
server. For Aidbox (Basic auth):

    AIDBOX_SECRET=<root client secret> python post.py

For an open server (e.g. a local HAPI FHIR), just set FHIR_URL and omit the secret:

    FHIR_URL=http://localhost:8090/fhir python post.py

fhirpy is wired in because the types were generated with `fhirpyClient: true`:
the generated resources extend FhirpyBaseModel, expose `resourceType` at class
level, and serialize via `model_dump`, which is everything fhirpy's typed client
needs to create/search/deserialize them.
"""

import asyncio
import base64
import json
import os

from fhirpy import AsyncFHIRClient

from fhir_types.hl7_fhir_r4_core.observation import Observation


def make_client() -> AsyncFHIRClient:
    url = os.environ.get("FHIR_URL") or os.environ.get("AIDBOX_URL", "http://localhost:8080/fhir")
    dump = lambda r: r.model_dump(by_alias=True, exclude_none=True)

    # Basic auth when a secret is provided (Aidbox); otherwise an open server.
    secret = os.environ.get("AIDBOX_SECRET")
    if secret:
        user = os.environ.get("AIDBOX_USER", "root")
        token = base64.b64encode(f"{user}:{secret}".encode()).decode()
        return AsyncFHIRClient(url, authorization=f"Basic {token}", dump_resource=dump)
    return AsyncFHIRClient(url, dump_resource=dump)


async def main() -> None:
    client = make_client()

    with open("bundle.json") as f:
        bundle = json.load(f)

    # POST the whole transaction bundle to the base endpoint; Aidbox resolves the
    # urn:uuid cross-references and assigns real ids atomically.
    response = await client.execute("/", method="post", data=bundle)
    print("Transaction committed:", response.get("type"))

    # Read the stored US Core Blood Pressure observations back as typed resources.
    observations = await client.resources(Observation).search(code="http://loinc.org|85354-9").fetch()
    print(f"Stored BP observations: {len(observations)}")
    for obs in observations:
        assert isinstance(obs, Observation)
        subject = obs.subject.reference if obs.subject else None
        print(" ", obs.id, subject)


if __name__ == "__main__":
    asyncio.run(main())
