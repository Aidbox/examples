package com.cql.app.example.services;

import org.opencds.cqf.cql.engine.execution.ExpressionResult;
import org.hl7.fhir.instance.model.api.IBase;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.instance.model.api.IPrimitiveType;


import java.util.Map;
import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.context.FhirVersionEnum;
import ca.uhn.fhir.rest.client.api.IGenericClient;
import ca.uhn.fhir.rest.client.interceptor.BasicAuthInterceptor;
import org.cqframework.cql.cql2elm.CqlCompilerOptions;
import org.cqframework.cql.cql2elm.LibraryManager;
import org.cqframework.cql.cql2elm.ModelManager;
import org.cqframework.cql.cql2elm.quick.FhirLibrarySourceProvider;
import org.opencds.cqf.cql.engine.data.CompositeDataProvider;
import org.opencds.cqf.cql.engine.execution.CqlEngine;
import org.opencds.cqf.cql.engine.execution.Environment;
import org.opencds.cqf.cql.engine.fhir.model.R4FhirModelResolver;
import org.opencds.cqf.cql.engine.fhir.retrieve.RestFhirRetrieveProvider;
import org.opencds.cqf.cql.engine.fhir.searchparam.SearchParameterResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.io.IOException;
import java.io.InputStream;

@Service
public class CqlEvaluateService {

    Logger logger = LoggerFactory.getLogger(CqlEvaluateService.class);

    public static class CachedR4FhirModelResolver extends R4FhirModelResolver {
        public CachedR4FhirModelResolver() {
            super(FhirContext.forCached(FhirVersionEnum.R4));
        }
    }

    public LibraryManager libraryManager;
    private final CqlEngine engine;

    public CqlEvaluateService(
            @Value("${aidbox.url}") String url,
            @Value("${aidbox.client.name}") String username,
            @Value("${aidbox.client.password}") String pass) {
        var modelManager = new ModelManager();
        var compilerOptions = CqlCompilerOptions.defaultOptions();
        this.libraryManager = new LibraryManager(modelManager, compilerOptions);
        this.libraryManager.getLibrarySourceLoader().clearProviders();
        this.libraryManager.getLibrarySourceLoader().registerProvider(new FhirLibrarySourceProvider());
        this.libraryManager.getLibrarySourceLoader().registerProvider(libraryIdentifier -> {
            try {
                var CqlFile = new ClassPathResource(libraryIdentifier.getId() + ".cql");
                InputStream targetStream = CqlFile.getInputStream();
                return targetStream;
            } catch (Exception e) {
                return null;
            }
        });

        var r4Context = FhirContext.forCached(FhirVersionEnum.R4);
        var r4ModelResolver = new CachedR4FhirModelResolver();

        IGenericClient aidboxClient = r4Context.newRestfulGenericClient(url);
        aidboxClient.registerInterceptor(new BasicAuthInterceptor(username, pass));

        var r4RetrieveProvider = new RestFhirRetrieveProvider(new SearchParameterResolver(r4Context),
                r4ModelResolver,
                aidboxClient);

        var r4Provider = new CompositeDataProvider(r4ModelResolver, r4RetrieveProvider);

        this.engine = new CqlEngine(new Environment(libraryManager));
        this.engine.getState().getEnvironment().registerDataProvider("http://hl7.org/fhir", r4Provider);
    }

    private boolean isValidJson(String str) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.readTree(str);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    public String buildResponse (Map<String, ExpressionResult> result) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            ObjectNode response = objectMapper.createObjectNode();
            ArrayNode parameters = objectMapper.createArrayNode();
            response.set("resourceType", objectMapper.getNodeFactory().textNode("Parameters"));

            for (var entry : result.entrySet()) {
                var expressionName = entry.getKey();
                var expressionValue = entry.getValue().value();
                for (var value : (Iterable)expressionValue) {
                    ObjectNode parameter = objectMapper.createObjectNode();
                    var valueStr = FhirContext.forR4().newJsonParser().encodeToString((IBase)value);
                    parameter.set("name", objectMapper.getNodeFactory().textNode(expressionName));
                    if (value instanceof IBaseResource) {
                        parameter.set("resource", objectMapper.readTree(valueStr));
                    } else if (value instanceof IPrimitiveType) {
                        var chars = ((IPrimitiveType)value).fhirType().toCharArray();
                        chars[0] = Character.toUpperCase(chars[0]);
                        String formattedKey = "value" + new String(chars);
                        String stringValue = ((IPrimitiveType<?>) value).getValueAsString();
                        if (isValidJson(stringValue)) {
                            parameter.set(formattedKey, objectMapper.readTree(stringValue));
                        } else {
                            parameter.set(formattedKey, objectMapper.getNodeFactory().textNode(stringValue));
                        }
                    } else if (value != null) {
                        var chars = ((IBase)value).fhirType().toCharArray();
                        chars[0] = Character.toUpperCase(chars[0]);
                        parameter.set("value" + new String(chars), objectMapper.readTree(valueStr));
                    }
                    parameters.add(parameter);
                }
            }
            response.set("parameters", parameters);
            objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
            return objectMapper.writeValueAsString(response);
        }  catch (IOException e) {
            throw new RuntimeException(e);
        }

    }


    public String evaluate(String libraryName) {
        logger.info("Evaluating file: {} ", libraryName);
        var result = engine.evaluate(libraryName);
        return buildResponse(result.expressionResults);
    }
}
