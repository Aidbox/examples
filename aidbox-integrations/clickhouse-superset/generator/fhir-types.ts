import { APIBuilder } from '@atomic-ehr/codegen';

const builder = new APIBuilder()
  .fromPackage("hl7.fhir.r4.core", "4.0.1")
  .typescript({})
  .outputTo("./fhir-r4/fhir-types")
  .treeShake({
    "hl7.fhir.r4.core": {
      "http://hl7.org/fhir/StructureDefinition/Encounter": {},
      "http://hl7.org/fhir/StructureDefinition/Appointment": {},
    }
  });

const report = await builder.generate();

console.log(report);

if (!report.success) {
  console.error("FHIR types generation failed.");
  process.exit(1);
}
