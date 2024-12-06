from fhirpy import SyncFHIRClient
from typing import List, Optional, Literal, Annotated
from fhirpy.base.resource_protocol import ResourceProtocol
from pydantic import BaseModel as BaseModel_, Field, Extra
from datetime import datetime

# Models
class BaseModel(BaseModel_):
    class Config:
        validate_assignment = True
        allow_population_by_field_name = True

    def dict(self, *args, **kwargs):
        by_alias = kwargs.pop('by_alias', True)
        return super().dict(*args, **kwargs, by_alias=by_alias)


class HumanName(BaseModel):
    use: Optional[str] = None
    text: Optional[str] = None
    given: Optional[List[str]] = None
    family: Optional[str] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None


class Patient(BaseModel):
    resourceType: str = 'Patient'
    id: Optional[str] = None
    gender: Optional[str] = None
    name: Optional[List[HumanName]] = None
    active: Optional[bool] = None

client = SyncFHIRClient(
    url="http://localhost:8888/",
    authorization="Basic cm9vdDpzZWNyZXQ=",
    # dump_resource=BaseModel.model_dump
)

newpt = Patient(
    name=[HumanName(given=['rabrab'], family='Bababa')],
    active=True,
    gender='female'
)

def csv_to_dict(file_path):
    with open(file_path, mode='r') as file:
        lines = file.readlines()
        keys = lines[0].strip().split(',')
        data = lines[1:]
        result = []
        for line in data:
            values = line.strip().split(',')
            result.append(dict(zip(keys, values)))
        return result

def dict_to_csv(data, file_path):
    with open(file_path, mode='w') as file:
        columns = data[0].keys()
        rows = []
        for item in data:
            rows.append(','.join([str(item[column]) for column in columns]))
        file.write(','.join(columns) + '\n')
        file.write('\n'.join(rows))


def import_data(client, file_path):
    raw_data = csv_to_dict(file_path)
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S+00:00')
    for item in raw_data:
        patient_to_update = client.resource("Patient",
            name=[{'given': [item['given']], 'family': item['family']}],
            gender=item['gender'],
        )
        patient, is_created = client.resources("Patient").search(given=item['given'], family=item['family']).update(patient_to_update)
        patient_id = dict(patient)['id']
        observation = client.resource("Observation",
            status='final',
            code={'text': 'Body weight'},
            subject={'reference': f'Patient/{patient_id}'},
            valueQuantity={'value':int(item['weight']), 'unit': 'kg'},
            effectiveDateTime=now,
        )

import_data(client, 'patients.csv')

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
