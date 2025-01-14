library example

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

define "MalePatients":
  [Patient] P
    where P.gender.value = 'male'
    return P.name.family
