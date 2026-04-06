package com.cql.app.example.services;

import org.opencds.cqf.cql.engine.execution.ExpressionResult;
import org.opencds.cqf.cql.engine.execution.EvaluationResult;
import org.opencds.cqf.cql.engine.execution.EvaluationResults;
import org.opencds.cqf.cql.engine.execution.EvaluationParams;
import org.hl7.fhir.instance.model.api.IBase;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.instance.model.api.IPrimitiveType;

import java.util.HashMap;
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
import org.opencds.cqf.cql.engine.data.DataProvider;
import org.opencds.cqf.cql.engine.execution.CqlEngine;
import org.opencds.cqf.cql.engine.execution.Environment;
import org.opencds.cqf.cql.engine.fhir.model.R4FhirModelResolver;
import org.opencds.cqf.cql.engine.fhir.retrieve.RestFhirRetrieveProvider;
import org.opencds.cqf.cql.engine.fhir.searchparam.SearchParameterResolver;
import org.opencds.cqf.cql.engine.fhir.terminology.R4FhirTerminologyProvider;
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

// kotlinx-io bridge: CQL engine 4.x uses kotlinx.io.Source instead of java.io.InputStream
import kotlinx.io.JvmCoreKt;
import kotlinx.io.CoreKt;
import kotlinx.io.RawSource;
import kotlinx.io.Source;

@Service
public class CqlEvaluateService {

    Logger logger = LoggerFactory.getLogger(CqlEvaluateService.class);

    // Patch 2: FullExpandTerminologyWrapper
    //
    // R4FhirTerminologyProvider is final in 4.x (Kotlin), so we use composition.
    // On HAPI FHIR server, $expand returns all codes by default.
    // On Aidbox, $expand may return incomplete results without explicit count.
    // This wrapper adds count=10000 to every $expand call.
    public static class FullExpandTerminologyWrapper
            implements org.opencds.cqf.cql.engine.terminology.TerminologyProvider {
        private final R4FhirTerminologyProvider delegate;
        private final IGenericClient fhirClient;

        public FullExpandTerminologyWrapper(IGenericClient fhirClient) {
            this.delegate = new R4FhirTerminologyProvider(fhirClient);
            this.fhirClient = fhirClient;
        }

        @Override
        public boolean in(org.opencds.cqf.cql.engine.runtime.Code code,
                         org.opencds.cqf.cql.engine.terminology.ValueSetInfo valueSet) {
            return delegate.in(code, valueSet);
        }

        @Override
        public org.opencds.cqf.cql.engine.runtime.Code lookup(
                org.opencds.cqf.cql.engine.runtime.Code code,
                org.opencds.cqf.cql.engine.terminology.CodeSystemInfo codeSystem) {
            return delegate.lookup(code, codeSystem);
        }

        @Override
        public Iterable<org.opencds.cqf.cql.engine.runtime.Code> expand(
                org.opencds.cqf.cql.engine.terminology.ValueSetInfo valueSet) {
            String id = delegate.resolveValueSetId(valueSet);

            org.hl7.fhir.r4.model.Parameters in = new org.hl7.fhir.r4.model.Parameters();
            in.addParameter().setName("count").setValue(
                    new org.hl7.fhir.r4.model.IntegerType(10000));

            org.hl7.fhir.r4.model.Parameters out = fhirClient
                    .operation()
                    .onInstance(new org.hl7.fhir.r4.model.IdType("ValueSet", id))
                    .named("expand")
                    .withParameters(in)
                    .execute();

            org.hl7.fhir.r4.model.ValueSet expanded =
                    (org.hl7.fhir.r4.model.ValueSet) out.getParameter().get(0).getResource();
            java.util.List<org.opencds.cqf.cql.engine.runtime.Code> codes = new java.util.ArrayList<>();
            for (var c : expanded.getExpansion().getContains()) {
                codes.add(new org.opencds.cqf.cql.engine.runtime.Code()
                        .withCode(c.getCode())
                        .withSystem(c.getSystem())
                        .withVersion(c.getVersion())
                        .withDisplay(c.getDisplay()));
            }
            return codes;
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

        // CQL library source provider: loads .cql files from classpath.
        // 4.x returns kotlinx.io.Source — bridge from InputStream via JvmCoreKt/CoreKt.
        this.libraryManager.getLibrarySourceLoader().registerProvider(libraryIdentifier -> {
            try {
                var cqlFile = new ClassPathResource(libraryIdentifier.getId() + ".cql");
                InputStream inputStream = cqlFile.getInputStream();
                RawSource rawSource = JvmCoreKt.asSource(inputStream);
                return CoreKt.buffered(rawSource);
            } catch (Exception e) {
                return null;
            }
        });

        var r4Context = FhirContext.forCached(FhirVersionEnum.R4);
        var r4ModelResolver = new R4FhirModelResolver(r4Context);

        IGenericClient fhirClient = r4Context.newRestfulGenericClient(url);
        fhirClient.registerInterceptor(new BasicAuthInterceptor(username, pass));

        // Patch 2: use wrapper that adds count=10000 to $expand (required for Aidbox)
        var terminologyProvider = new FullExpandTerminologyWrapper(fhirClient);

        var r4RetrieveProvider = new RestFhirRetrieveProvider(
                new SearchParameterResolver(r4Context), r4ModelResolver, fhirClient);
        r4RetrieveProvider.setTerminologyProvider(terminologyProvider);
        r4RetrieveProvider.setExpandValueSets(true);
        r4RetrieveProvider.setMaxCodesPerQuery(64);
        r4RetrieveProvider.setQueryBatchThreshold(32);

        var r4Provider = new CompositeDataProvider(r4ModelResolver, r4RetrieveProvider);

        // 4.x: Environment constructor takes Map<String, DataProvider> (not null)
        Map<String, DataProvider> dataProviders = new HashMap<>();
        dataProviders.put("http://hl7.org/fhir", r4Provider);
        // Patch 3: CMS measures use QICore profiles — engine looks up data by QICore URI
        dataProviders.put("http://hl7.org/fhir/us/qicore", r4Provider);

        var environment = new Environment(libraryManager, dataProviders, terminologyProvider);
        this.engine = new CqlEngine(environment);
    }

    private boolean isValidJson(String str) {
        try {
            new ObjectMapper().readTree(str);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    public String buildResponse(Map<String, ExpressionResult> result) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            ObjectNode response = objectMapper.createObjectNode();
            ArrayNode parameters = objectMapper.createArrayNode();
            response.set("resourceType", objectMapper.getNodeFactory().textNode("Parameters"));

            for (var entry : result.entrySet()) {
                var expressionName = entry.getKey();
                var expressionValue = entry.getValue().getValue();

                if (expressionValue == null) {
                    ObjectNode parameter = objectMapper.createObjectNode();
                    parameter.set("name", objectMapper.getNodeFactory().textNode(expressionName));
                    parameter.set("valueString", objectMapper.getNodeFactory().textNode("null"));
                    parameters.add(parameter);
                } else if (expressionValue instanceof Boolean) {
                    ObjectNode parameter = objectMapper.createObjectNode();
                    parameter.set("name", objectMapper.getNodeFactory().textNode(expressionName));
                    parameter.set("valueBoolean", objectMapper.getNodeFactory().booleanNode((Boolean) expressionValue));
                    parameters.add(parameter);
                } else if (expressionValue instanceof String) {
                    ObjectNode parameter = objectMapper.createObjectNode();
                    parameter.set("name", objectMapper.getNodeFactory().textNode(expressionName));
                    parameter.set("valueString", objectMapper.getNodeFactory().textNode((String) expressionValue));
                    parameters.add(parameter);
                } else if (expressionValue instanceof Integer) {
                    ObjectNode parameter = objectMapper.createObjectNode();
                    parameter.set("name", objectMapper.getNodeFactory().textNode(expressionName));
                    parameter.set("valueInteger", objectMapper.getNodeFactory().numberNode((Integer) expressionValue));
                    parameters.add(parameter);
                } else if (expressionValue instanceof Iterable) {
                    for (var value : (Iterable) expressionValue) {
                        ObjectNode parameter = objectMapper.createObjectNode();
                        parameter.set("name", objectMapper.getNodeFactory().textNode(expressionName));
                        if (value instanceof IBaseResource) {
                            var valueStr = FhirContext.forR4().newJsonParser().encodeToString((IBase) value);
                            parameter.set("resource", objectMapper.readTree(valueStr));
                        } else if (value instanceof IPrimitiveType) {
                            var chars = ((IPrimitiveType) value).fhirType().toCharArray();
                            chars[0] = Character.toUpperCase(chars[0]);
                            String formattedKey = "value" + new String(chars);
                            String stringValue = ((IPrimitiveType<?>) value).getValueAsString();
                            if (isValidJson(stringValue)) {
                                parameter.set(formattedKey, objectMapper.readTree(stringValue));
                            } else {
                                parameter.set(formattedKey, objectMapper.getNodeFactory().textNode(stringValue));
                            }
                        } else if (value instanceof IBase) {
                            var valueStr = FhirContext.forR4().newJsonParser().encodeToString((IBase) value);
                            var chars = ((IBase) value).fhirType().toCharArray();
                            chars[0] = Character.toUpperCase(chars[0]);
                            parameter.set("value" + new String(chars), objectMapper.readTree(valueStr));
                        } else if (value != null) {
                            parameter.set("valueString", objectMapper.getNodeFactory().textNode(value.toString()));
                        }
                        parameters.add(parameter);
                    }
                } else if (expressionValue instanceof IBase) {
                    ObjectNode parameter = objectMapper.createObjectNode();
                    var valueStr = FhirContext.forR4().newJsonParser().encodeToString((IBase) expressionValue);
                    parameter.set("name", objectMapper.getNodeFactory().textNode(expressionName));
                    if (expressionValue instanceof IBaseResource) {
                        parameter.set("resource", objectMapper.readTree(valueStr));
                    } else {
                        var chars = ((IBase) expressionValue).fhirType().toCharArray();
                        chars[0] = Character.toUpperCase(chars[0]);
                        parameter.set("value" + new String(chars), objectMapper.readTree(valueStr));
                    }
                    parameters.add(parameter);
                } else {
                    ObjectNode parameter = objectMapper.createObjectNode();
                    parameter.set("name", objectMapper.getNodeFactory().textNode(expressionName));
                    parameter.set("valueString", objectMapper.getNodeFactory().textNode(expressionValue.toString()));
                    parameters.add(parameter);
                }
            }
            response.set("parameters", parameters);
            objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
            return objectMapper.writeValueAsString(response);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public String evaluate(String libraryName, String patientId) {
        logger.info("Evaluating library: {} for patient: {}", libraryName, patientId != null ? patientId : "(all)");

        // 4.x: evaluate() uses builder pattern, returns EvaluationResults (plural)
        EvaluationResults results;
        if (patientId != null && !patientId.isEmpty()) {
            results = engine.evaluate(builder -> {
                builder.library(libraryName, libBuilder -> { return kotlin.Unit.INSTANCE; });
                builder.setContextParameter(new kotlin.Pair<>("Patient", patientId));
                return kotlin.Unit.INSTANCE;
            });
        } else {
            results = engine.evaluate(builder -> {
                builder.library(libraryName, libBuilder -> { return kotlin.Unit.INSTANCE; });
                return kotlin.Unit.INSTANCE;
            });
        }

        var result = results.getOnlyResultOrThrow();
        return buildResponse(result.getExpressionResults());
    }
}
