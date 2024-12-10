#####################################################################
# Use <https://github.com/beda-software/fhir-py>. Only Runtime


from fhirpy import SyncFHIRClient
from utils import read_csv_as_dict, now


def import_data(client, file_path):
    raw_data = read_csv_as_dict(file_path)
    for item in raw_data:
        patient_to_update = client.resource(
            "Patient",
            name=[{"given": [item["given"]], "family": item["family"]}],
            gender=item["gender"],
        )
        patient, is_created = (
            client.resources("Patient")
            .search(given=item["given"], family=item["family"])
            .update(patient_to_update)
        )
        patient_id = dict(patient)["id"]
        print(
            f"Patient {item [ 'given']} {item['family']} {'created' if is_created else 'updated'}. Id: {patient_id}"
        )
        observation = client.resource(
            "Observation",
            status="final",
            code={"text": "Body weight"},
            subject={"reference": f"Patient/{patient_id}"},
            valueQuantity={"value": int(item["weight"]), "unit": "kg"},
            effectiveDateTime=now(),
        )
        observation.save()
        print(
            f"Observation for {item['given']} {item['family']} created. Id: {observation.id}"
        )


client = SyncFHIRClient(
    url="http://localhost:8888/", authorization="Basic cm9vdDpzZWNyZXQ="
)

import_data(client, "data/patients.csv")
