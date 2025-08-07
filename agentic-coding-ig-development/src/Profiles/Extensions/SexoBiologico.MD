URL: SexoBiologico
Version: 2.0.0
Status: draft
Publisher: TESTCOMPANY
Jurisdiction: Chile
Use Context: Can be used in Patient and Practitioner resources.
Type: Extension
Experimental: true

⸻

📋 Description

“Sexo Biologico del paciente”
This extension is used to represent the biological sex of a patient in a structured and interoperable way, following healthcare standards relevant in Chile.

🧩 Extension Structure

url
Fixed to the official URI of the extension definition.
value[x]
A CodeableConcept representing biological sex.
extension
Not allowed (max = 0) – this is a simple extension.

🎯 Terminology Binding
	•	Primary ValueSet: VSSexoBiologico
Binding Strength: preferred
This is the recommended set of biological sex codes for Chilean healthcare.
	•	Additional Binding (for compatibility):
	•	FHIR core: http://hl7.org/fhir/ValueSet/administrative-gender
	•	Purpose: candidate
	•	Note: Included for backward compatibility with FHIR administrative gender concepts.

⸻
