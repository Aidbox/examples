#####################################################################
# Use <https://github.com/beda-software/fhir-py>. with fhirpy-types-r4b


from fhirpy import SyncFHIRClient
from fhirpy_types_r4b import CodeableConcept, HumanName, Observation, Patient, Quantity, Reference
from utils import read_csv_as_dict, now


def import_data(client, file_path):
    raw_data = read_csv_as_dict(file_path)
    for item in raw_data:
        patient_to_update = Patient(
            name=[HumanName(given=[item['given']], family=item['family'])],
            gender=item['gender']
        )
        patient, is_created = (
            client.resources(Patient)
            .search(given=item["given"], family=item["family"])
            .update(patient_to_update)
        )
        patient_id = dict(patient)["id"]
        print(
            f"Patient {item [ 'given']} {item['family']} {'created' if is_created else 'updated'}. Id: {patient_id}"
        )

        new_observation = Observation(
            status='final',
            code=CodeableConcept(text='Body weight'),
            subject=Reference(reference=f"Patient/{patient_id}"),
            valueQuantity=Quantity(value=int(item["weight"]), unit='kg'),
            effectiveDateTime=now()
        )
        observation = client.save(new_observation)
        print(
            f"Observation for {item['given']} {item['family']} created. Id: {observation.id}"
        )


client = SyncFHIRClient(
    url="http://localhost:8888/",
    authorization="Basic cm9vdDpzZWNyZXQ=",
)

import_data(client, "data/patients.csv")
