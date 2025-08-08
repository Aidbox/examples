# Patient Profile - PacienteCl

**URL:** `PacienteCl`  
**Version:** 1.0.0  
**Status:** Active  
**Publisher:** TESTCOMPANY  
**Date:** August 4, 2025

---

## 📝 Purpose

Designed to meet Chile's national clinical record needs, the profile extends the base FHIR Patient resource with Chile-specific constraints and extensions such as gender identity, biological sex, nationality, and additional identifiers.

---

## 📌 Key Constraints & Extensions

### Extensions
- **IdentidadDeGenero** – Required - Slice by URL
- **SexoBiologico** – Required - Slice by URL

### Identifiers
- At least one with `use = official` required
- Must also have a value - Slice by use

### Name
- At least one with `use = official` required
- Must have family, given, and prefix - Slice by use

### Telecom
- At least one telecom channel required

---

## 📈 Profile Structure & Stats

- Derived from the FHIR Patient resource
- Uses open slicing for extensions
