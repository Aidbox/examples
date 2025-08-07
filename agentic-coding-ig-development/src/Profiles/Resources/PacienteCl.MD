Patient Profile –

URL: PacienteCl
Version: 1.0.0
Status: Active
Publisher: TESTCOMPANY
Date: August 4, 2025

⸻

📝 Purpose

Designed to meet Chile’s national clinical record needs, the profile extends the base FHIR Patient resource with Chile-specific constraints and extensions such as gender identity, biological sex, nationality, and additional identifiers  ￼.

⸻

📌 Key Constraints & Extensions
	•	Extensions:
	  *	IdentidadDeGenero – required - slice by url
	  *	SexoBiologico – required - slice by url
	•	Identifiers
	  * at least one with use = official required. It must also has a value - slice by use
	•	Name
	  *	al least one with use = official required. It must have family, given, and prefix - slice by use
	•	Telecom
	  *	At least one telecom channel required
⸻

📈 Profile Structure & Stats
	•	Derived from the FHIR Patient resource
	•	Uses open slicing for extensions
