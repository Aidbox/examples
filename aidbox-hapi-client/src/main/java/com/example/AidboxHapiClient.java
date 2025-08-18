package com.example;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.rest.client.api.IGenericClient;
import ca.uhn.fhir.rest.client.interceptor.BasicAuthInterceptor;
import ca.uhn.fhir.rest.api.MethodOutcome;
import org.hl7.fhir.r4.model.*;

import java.util.Date;

/**
 * Example Java application that uses HAPI FHIR client to create a patient in Aidbox
 */
public class AidboxHapiClient {
    
    public static void main(String[] args) {
        try {
            
            FhirContext ctx = FhirContext.forR4();
            
            IGenericClient client = ctx.newRestfulGenericClient("http://localhost:8080/fhir");
            
            // Add basic authentication
            BasicAuthInterceptor authInterceptor = new BasicAuthInterceptor("basic", "secret");
            client.registerInterceptor(authInterceptor);
            
            // Create a simple patient
            Patient patient = new Patient();
            patient.addName().setFamily("Doe").addGiven("John");
            patient.setBirthDate(new Date(90, 0, 15)); // January 15, 1990
            patient.setGender(Enumerations.AdministrativeGender.MALE);
            
            
            System.out.println("Creating patient: " + patient.getNameFirstRep().getNameAsSingleString());
            
            // Create the patient on the server
            MethodOutcome outcome = client.create()
                    .resource(patient)
                    .execute();
            
            if (outcome.getCreated()) {
                System.out.println("Patient created successfully!");
                System.out.println("Patient ID: " + outcome.getId().getIdPart());
            } else {
                System.out.println("Patient creation may have failed or was updated");
            }
            
            // Retrieve the created patient to verify
            Patient createdPatient = client.read()
                    .resource(Patient.class)
                    .withId(outcome.getId().getIdPart())
                    .execute();
            
            System.out.println("Retrieved patient: " + createdPatient.getNameFirstRep().getNameAsSingleString());
            System.out.println("Patient birth date: " + createdPatient.getBirthDate());
            System.out.println("Patient gender: " + createdPatient.getGender());
            
        } catch (Exception e) {
            System.err.println("Error creating patient: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
