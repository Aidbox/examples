using Hl7.Fhir.Model;
using Hl7.Fhir.Rest;
using System;
using System.Collections.Generic;
using System.Linq;

var client = new FhirClient(new Uri("http://localhost:8080/fhir"), new FhirClientSettings
{
    PreferredFormat = ResourceFormat.Json,
    UseAsync = true,
    VerifyFhirVersion = false
});

client.RequestHeaders.Add("Authorization", "Basic YmFzaWM6c2VjcmV0");

var patient = new Patient
{
    Name = new List<HumanName> { new() { Family = "Doe", Given = new List<string> { "John" } } },
    BirthDate = "1990-01-15",
    Gender = AdministrativeGender.Male
};

Console.WriteLine($"Creating patient: {patient.Name[0].Given.FirstOrDefault()} {patient.Name[0].Family}");

var createdPatient = await client.CreateAsync(patient);
Console.WriteLine($"Patient created successfully! ID: {createdPatient.Id}");

var retrievedPatient = await client.ReadAsync<Patient>($"Patient/{createdPatient.Id}");
Console.WriteLine($"Retrieved patient: {retrievedPatient.Name[0].Given.FirstOrDefault()} {retrievedPatient.Name[0].Family}");
Console.WriteLine($"Patient birth date: {retrievedPatient.BirthDate}");
Console.WriteLine($"Patient gender: {retrievedPatient.Gender}");
