#####################################################################
# Use <https://github.com/beda-software/fhir-py>


from dataclasses import dataclass, field, asdict
from typing import List, Optional

from pydantic import BaseModel
from fhirpy import SyncFHIRClient

from utils import read_csv_as_dict, now

from generated.hl7_fhir_r4_core.base import *
from generated.hl7_fhir_r4_core.observation import Observation
from generated.hl7_fhir_r4_core.patient import Patient

def import_data(client, file_path):
    raw_data = read_csv_as_dict(file_path)
    for item in raw_data:
        patient_to_update = Patient(
            name=[
                HumanName(
                    given=[item['given']],
                    family=item['family'])
            ],
            gender=item['gender']
        )
        patient, is_created = (
            client
            .resources(Patient)
            .search(given=item["given"],
                    family=item["family"])
            .update(patient_to_update)
        )

        print(
            f"Patient {item['given']} {item['family']} {'created' if is_created else 'updated'}. Id: {patient.id}"
        )

        new_observation = Observation(
            status="final",
            code=CodeableConcept(text='Body weight'),
            subject=Reference(reference=f"Patient/{patient.id}"),
            valueQuantity=Quantity(value=int(item["weight"]), unit='kg'),
            effectiveDateTime=now(),
        )
        observation = client.create(new_observation)
        print(
            f"Observation for {item['given']} {item['family']} created. Id: {observation.id}"
        )


client = SyncFHIRClient(
    url="http://localhost:8888/",
    authorization="Basic cm9vdDpzZWNyZXQ=",
    dump_resource=BaseModel.model_dump
)

import_data(client, "data/patients.csv")
