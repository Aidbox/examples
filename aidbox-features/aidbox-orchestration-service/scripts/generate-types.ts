import { APIBuilder, prettyReport } from "@atomic-ehr/codegen";

const builder = new APIBuilder()
    .throwException()
    .fromPackage("hl7.fhir.r4.core", "4.0.1")
    .fromPackageRef("https://fs.get-ig.org/-/fhir.r4.ukcore.stu2-2.0.2.tgz")
    .typescript({
        withDebugComment: false,
        generateProfile: true,
        openResourceTypeSet: false,
    })
    .typeSchema({
        treeShake: {
            "hl7.fhir.r4.core": {
                "http://hl7.org/fhir/StructureDefinition/Patient": {},
                "http://hl7.org/fhir/StructureDefinition/AllergyIntolerance": {},
                "http://hl7.org/fhir/StructureDefinition/Observation": {},
                "http://hl7.org/fhir/StructureDefinition/Encounter": {},
                "http://hl7.org/fhir/StructureDefinition/Bundle": {},
                "http://hl7.org/fhir/StructureDefinition/Parameters": {},
                "http://hl7.org/fhir/StructureDefinition/OperationOutcome": {},
                "http://hl7.org/fhir/StructureDefinition/Provenance": {},
            },
            "fhir.r4.ukcore.stu2": {
                "https://fhir.hl7.org.uk/StructureDefinition/UKCore-Patient": {},
                "https://fhir.hl7.org.uk/StructureDefinition/UKCore-AllergyIntolerance": {},
                // UKCore-Observation and UKCore-Encounter are excluded due to a known assertion
                // bug in @atomic-ehr/codegen tree-shaking for profiles with polymorphic fields.
                // Base R4 Observation and Encounter types are used instead.
            },
        },
    })
    .outputTo("./src/fhir-types")
    .cleanOutput(true);

const report = await builder.generate();
console.log(prettyReport(report));
if (!report.success) process.exit(1);
