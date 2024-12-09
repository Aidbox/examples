# ruff: noqa: E402


#####################################################################
# Use <https://github.com/beda-software/fhir-py>. with fhirpy-types-r4b


from fhirpy import SyncFHIRClient
from fhirpy_types_r4b import HumanName, Patient, BaseModel
from utils import read_csv_as_dict, now


patient = Patient(active=True)

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
    url="http://localhost:8888/",
    authorization="Basic cm9vdDpzZWNyZXQ=",
)

import_data(client, "data/patients.csv")


#####################################################################
# Use <https://github.com/beda-software/fhir-py>. With generated
# resource classes


# from fhirpy.base.resource_protocol import ResourceProtocol
# from pydantic import BaseModel as BaseModel_, Field, Extra
# from typing import List, Optional, Literal, Annotated


# # Models
# class BaseModel(BaseModel_):
#     class Config:
#         validate_assignment = True
#         allow_population_by_field_name = True

#     def dict(self, *args, **kwargs):
#         by_alias = kwargs.pop("by_alias", True)
#         return super().dict(*args, **kwargs, by_alias=by_alias)


# class HumanName(BaseModel):
#     use: Optional[str] = None
#     text: Optional[str] = None
#     given: Optional[List[str]] = None
#     family: Optional[str] = None
#     prefix: Optional[List[str]] = None
#     suffix: Optional[List[str]] = None


# class Patient(BaseModel):
#     resourceType: str = "Patient"
#     id: Optional[str] = None
#     gender: Optional[str] = None
#     name: Optional[List[HumanName]] = None
#     active: Optional[bool] = None


# client = SyncFHIRClient(
#     url="http://localhost:8888/",
#     authorization="Basic cm9vdDpzZWNyZXQ=",
#     # dump_resource=BaseModel.model_dump
# )

# newpt = Patient(
#     name=[HumanName(given=["rabrab"], family="Bababa")], active=True, gender="female"
# )


# find id (new patient or existing)
# patient = client.resources('Patient').search(name=f"{item['first_name']} {item['last_name']}").first()

# patient = client.resource('patient', )

# patient = Patient(
#     name=[HumanName(given=[item['first_name']], family=item['last_name'])],
#     active=item['active'] == 'True',

# 1. [ ] Write examples of runtime usage in [Aidbox/examples](https://github.com/Aidbox/examples):
#     - Tasks (with implementation stage):
#         1. Python module with CSV Patient+Observation import/export. Export should provide some kind of filters/searches.
#         2. Wrap it with FastAPI.
#     - SDK Adoption level:
#         1. Python SDK Runtime only.
#         1. Python SDK Runtime + provided Python classes.
#         1. Python SDK Runtime + FHIR Schema Codegen.
#     - In process we should use something like PyCharm and note autocompletion and typechecking warnings.
#     - Make comparison table between different SDK adoption levels. It should show to us sailing/growing points.


# client.create(newpt)


# print(read_file())

#

# newpt = Patient(name=[HumanName(text='John doe')], active=True)
# newpt = Patient(active=True)


# client.get()

# class API(BaseModel):
#     def save(self):
#         resource_type = self.__class__.__name__

#         client.save()

#         response = requests.put(
#             url=f"{base}/fhir/{resource_type}/{self.id or ''}",
#             json=self.dumps(exclude_unset=True),
#             auth=basic,
#         )
#         response.raise_for_status()  # TODO: handle and type HTTP codes except 200+
#         data = response.json()
#         self.id = data["id"]
#         self.meta = Meta(**data["meta"])

# class PatientAR(API):
#     active: Optional[bool] = None
