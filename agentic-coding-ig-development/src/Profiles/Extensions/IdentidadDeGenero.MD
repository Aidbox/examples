# Extension - IdentidadDeGenero

**URL:** `IdentidadDeGenero`  
**Profile Type:** Extension  
**Status:** Active  
**Publisher:** TESTCOMPANY  
**Date:** August 4, 2025

---

## 🧩 Purpose

This extension allows representing a patient's gender identity within Chilean health records, distinct from their biological sex. It is designed for use within the Patient resource and supports capturing gender identity in a structured, coded format.

---

## 📌 Key Features

### Context of Use
- Designed to be used within the Patient resource (`Patient.extension`)

### Data Type
- **CodeableConcept**

### Terminology Binding
- The value must be selected from a required value set: **VSIdentidadGenero**

### Cardinality
- **Minimum:** 0 (optional)
- **Maximum:** 1 (one gender identity per patient instance)

### Must Support
- The extension is marked as must-support, indicating receiving systems should be capable of processing it if present.
