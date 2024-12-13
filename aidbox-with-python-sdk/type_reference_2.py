#####################################################################
# Resource classes example with typed reference. Generic

from __future__ import annotations

from dataclasses import dataclass, InitVar, asdict
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


@dataclass(kw_only=True)
class Reference[T](Base):
    resourceType: str = "Reference"
    reference_id: InitVar[str]
    reference: str | None = None  # should be initialized in __post_init__

    def __post_init__(self, reference_id: str) -> None:
        self.reference = f"Organization/{reference_id}"


@dataclass
class Organization(Base):
    resourceType: str = "Organization"
    name: Optional[str] = None

    def reference(self) -> Reference[Organization]:
        assert self.id is not None
        return Reference[Organization](reference_id=self.id)


@dataclass
class Patient(Base):
    resourceType: str = "Patient"
    managingOrganization: Optional[Reference[Organization]] = None


print("------------------------------------------")
org1 = Organization(id="org1", name="org1")
print("org1", asdict(org1))

print("------------------------------------------")
assert org1.id is not None
org1_ref = Reference[Organization](reference_id=org1.id)
print("org1_ref", asdict(org1_ref))

print("------------------------------------------")
pt1 = Patient(id="pt-1", managingOrganization=org1_ref)
print(asdict(pt1))

print("------------------------------------------")
pt2 = Patient(id="pt-2", managingOrganization=org1.reference())
print(asdict(pt2))


# Problem:

# type_reference_2.py:27: error: Signature of "__replace__" incompatible with supertype "Base"  [override]
# type_reference_2.py:27: note:      Superclass:
# type_reference_2.py:27: note:          def __replace__(*, id: str | None = ..., meta: Meta | None = ...) -> Base
# type_reference_2.py:27: note:      Subclass:
# type_reference_2.py:27: note:          def __replace__(*, id: str | None = ..., meta: Meta | None = ..., resourceType: str = ..., reference_id: str, reference: str | None = ...) -> Reference[T]

# Don't looks like a real problem, but should be fixed.
