#####################################################################
# Resource classes example with typed reference. Classes for references.

from __future__ import annotations

from dataclasses import dataclass, asdict, InitVar
from typing import Optional
from typing_extensions import Any
from fhirpy.base.resource_protocol import ResourceProtocol


@dataclass
class Meta:
    lastUpdated: Optional[str]
    createdAt: Optional[str]
    versionId: Optional[str]


@dataclass
class Base(ResourceProtocol, dict[Any, Any]):
    id: Optional[str] = None
    meta: Optional[Meta] = None


@dataclass
class Organization(Base):
    resourceType: str = "Organization"
    name: Optional[str] = None

    def reference(self) -> OrganizationRef:
        assert self.id is not None
        return OrganizationRef(reference_id=self.id)


@dataclass
class Reference(Base):
    resourceType: str = "Reference"


# need kw_only because can't provide default values for some fields
@dataclass(kw_only=True)
class OrganizationRef(Reference):
    reference_id: InitVar[str]
    reference: str | None = None  # should be initialized in __post_init__

    def __post_init__(self, reference_id: str) -> None:
        self.reference = f"Organization/{reference_id}"


@dataclass
class Patient(Base):
    resourceType: str = "Patient"
    managingOrganization: Optional[OrganizationRef] = None


print("------------------------------------------")
org1 = Organization(id="org1", name="org1")
print("org1", asdict(org1))

print("------------------------------------------")
assert org1.id is not None
org1_ref = OrganizationRef(reference_id=org1.id)
print("org1_ref", asdict(org1_ref))

print("------------------------------------------")
pt1 = Patient(id="pt-1", managingOrganization=org1_ref)
print(asdict(pt1))

print("------------------------------------------")
pt2 = Patient(id="pt-2", managingOrganization=org1.reference())
print(asdict(pt2))
