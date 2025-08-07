# Extension - SexoBiologico

**URL:** `SexoBiologico`  
**Version:** 2.0.0  
**Status:** Draft  
**Publisher:** TESTCOMPANY  
**Jurisdiction:** Chile  
**Use Context:** Can be used in Patient and Practitioner resources  
**Type:** Extension  
**Experimental:** True

---

## 📋 Description

**"Sexo Biologico del paciente"**  
This extension is used to represent the biological sex of a patient in a structured and interoperable way, following healthcare standards relevant in Chile.

---

## 🧩 Extension Structure

### URL
- Fixed to the official URI of the extension definition

### Value[x]
- A **CodeableConcept** representing biological sex

### Extension
- Not allowed (max = 0) – this is a simple extension

---

## 🎯 Terminology Binding

### Primary ValueSet
- **VSSexoBiologico**
- **Binding Strength:** Preferred
- This is the recommended set of biological sex codes for Chilean healthcare

### Additional Binding (for compatibility)
- **FHIR core:** `http://hl7.org/fhir/ValueSet/administrative-gender`
- **Purpose:** Candidate
- **Note:** Included for backward compatibility with FHIR administrative gender concepts
