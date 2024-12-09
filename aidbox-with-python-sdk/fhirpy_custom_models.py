# ruff: noqa: E402


#####################################################################
# Use <https://github.com/beda-software/fhir-py>. With custom data models


from dataclasses import dataclass, field
from typing import List, Optional
from dataclasses import asdict

from fhirpy import SyncFHIRClient
from fhirpy.base.resource_protocol import ResourceProtocol

from utils import read_csv_as_dict, now


@dataclass
class Meta:
    lastUpdated: Optional[str]
    createdAt: Optional[str]
    versionId: Optional[str]

@dataclass
class Base(ResourceProtocol, dict):
    id: Optional[str] = None
    meta: Optional[Meta] = None

@dataclass
class HumanName:
    given: Optional[List[str]] = field(default_factory=list)
    family: Optional[str] = None


@dataclass
class Patient(Base):
    resourceType: str = 'Patient'
    name: Optional[List[HumanName]] = field(default_factory=list)
    gender: Optional[str] = None


@dataclass
class Quantity(Base):
    resourceType: str = 'Quantity'
    code: Optional[str] = None
    unit: Optional[str] = None
    value: Optional[float] = None
    system: Optional[str] = None
    comparator: Optional[str] = None


@dataclass
class Coding(Base):
    resourceType: str = 'Coding'
    code: Optional[str] = None
    system: Optional[str] = None
    display: Optional[str] = None
    version: Optional[str] = None
    user_selected: Optional[bool] = None


@dataclass
class CodeableConcept(Base):
    resourceType: str = 'CodeableConcept'
    text: Optional[str] = None
    coding: Optional[List[Coding]] = field(default_factory=list)


@dataclass
class Reference(Base):
    resourceType: str = 'Reference'
    reference: Optional[str] = None


@dataclass
class Observation(Base):
    resourceType: str = 'Observation'
    status: Optional[str] = None
    code: Optional[CodeableConcept] = None

    subject: Optional[Reference] = None
    valueQuantity: Optional[Quantity] = None
    effectiveDateTime: Optional[str] = None



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

        patient_id = asdict(patient)["id"]
        print(
            f"Patient {item [ 'given']} {item['family']} {'created' if is_created else 'updated'}. Id: {patient_id}"
        )

        new_observation = Observation(
            status="final",
            code=CodeableConcept(text='Body weight'),
            subject=Reference(reference=f"Patient/{patient_id}"),
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
    dump_resource=asdict
)


import_data(client, "data/patients.csv")
