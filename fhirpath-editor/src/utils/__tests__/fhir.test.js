import { describe, it, expect } from 'vitest';
import appToFhirPath, { expressionToFhirPath } from '../fhir';

describe('FHIRPath conversion', () => {
  it('should convert number tokens correctly', () => {
    const expression = [
      { type: 'number', value: '42' },
      { type: 'number', value: '3.14' }
    ];
    expect(expressionToFhirPath(expression)).toBe('423.14');
  });

  it('should convert string tokens correctly', () => {
    const expression = [
      { type: 'string', value: 'hello' }
    ];
    expect(expressionToFhirPath(expression)).toBe("'hello'");
  });

  it('should convert boolean tokens correctly', () => {
    const expression = [
      { type: 'boolean', value: 'true' },
      { type: 'operator', value: 'and' },
      { type: 'boolean', value: 'false' }
    ];
    expect(expressionToFhirPath(expression)).toBe("true and false");
  });

  it('should convert date tokens correctly', () => {
    const expression = [
      { type: 'date', value: '2023-05-15' }
    ];
    expect(expressionToFhirPath(expression)).toBe("@2023-05-15");
  });

  it('should convert datetime tokens correctly', () => {
    const expression = [
      { type: 'datetime', value: '2023-05-15T14:30:00' }
    ];
    expect(expressionToFhirPath(expression)).toBe("@2023-05-15T14:30:00");
  });

  it('should convert time tokens correctly', () => {
    const expression = [
      { type: 'time', value: '14:30:00' }
    ];
    expect(expressionToFhirPath(expression)).toBe("@T14:30:00");
  });

  it('should convert quantity tokens with object values correctly', () => {
    const expression = [
      { type: 'quantity', value: { value: '70', unit: 'kg' } }
    ];
    expect(expressionToFhirPath(expression)).toBe("70 'kg'");
  });

  it('should handle empty quantity tokens gracefully', () => {
    const expression = [
      { type: 'quantity', value: '' }
    ];
    expect(expressionToFhirPath(expression)).toBe("0 ''");
  });

  it('should handle null quantity tokens gracefully', () => {
    const expression = [
      { type: 'quantity', value: null }
    ];
    expect(expressionToFhirPath(expression)).toBe("0 ''");
  });

  it('should convert variable tokens correctly', () => {
    const expression = [
      { type: 'variable', value: 'patient' }
    ];
    expect(expressionToFhirPath(expression)).toBe("%patient");
  });

  it('should convert field tokens correctly', () => {
    const expression = [
      { type: 'variable', value: 'patient' },
      { type: 'field', value: 'name' }
    ];
    expect(expressionToFhirPath(expression)).toBe("%patient.name");
  });

  it('should handle various operators correctly', () => {
    // Test = operator (equality)
    const eqExpression = [
      { type: 'variable', value: 'age' },
      { type: 'operator', value: '=' },
      { type: 'number', value: '42' }
    ];
    expect(expressionToFhirPath(eqExpression)).toBe("%age = 42");

    // Test & operator (string concatenation)
    const concatExpression = [
      { type: 'string', value: 'Hello' },
      { type: 'operator', value: '&' },
      { type: 'string', value: 'World' }
    ];
    expect(expressionToFhirPath(concatExpression)).toBe("'Hello' & 'World'");

    // Test other operators
    const otherOperators = [
      { type: 'number', value: '10' },
      { type: 'operator', value: '>' },
      { type: 'number', value: '5' }
    ];
    expect(expressionToFhirPath(otherOperators)).toBe("10 > 5");
  });

  it('should convert complex expressions correctly', () => {
    const complexExpression = [
      { type: 'variable', value: 'patient' },
      { type: 'field', value: 'age' },
      { type: 'operator', value: '>' },
      { type: 'number', value: '18' },
      { type: 'operator', value: 'and' },
      { type: 'variable', value: 'patient' },
      { type: 'field', value: 'weight' },
      { type: 'operator', value: '<' },
      { type: 'quantity', value: { value: '100', unit: 'kg' } }
    ];
    
    expect(expressionToFhirPath(complexExpression))
      .toBe("%patient.age > 18 and %patient.weight < 100 'kg'");
  });

  it('should handle full app conversion with bindings', () => {
    const app = {
      expression: [
        { type: 'variable', value: 'patient' },
        { type: 'field', value: 'age' },
        { type: 'operator', value: '>' },
        { type: 'number', value: '18' }
      ],
      bindings: [
        {
          name: 'patient',
          expression: [
            { type: 'variable', value: 'Resource' }
          ]
        }
      ]
    };
    
    expect(appToFhirPath(app))
      .toBe("defineVariable(patient, %Resource)\n.select(%patient.age > 18)");
  });

  it('should convert type tokens correctly', () => {
    const expression = [
      { type: 'type', value: 'String' }
    ];
    expect(expressionToFhirPath(expression)).toBe("String");
  });

  it('should convert is operator with type token correctly', () => {
    const expression = [
      { type: 'variable', value: 'patient' },
      { type: 'field', value: 'name' },
      { type: 'operator', value: 'is' },
      { type: 'type', value: 'String' }
    ];
    expect(expressionToFhirPath(expression)).toBe("%patient.name is String");
  });

  it('should convert as operator with type token correctly', () => {
    const expression = [
      { type: 'variable', value: 'patient' },
      { type: 'field', value: 'age' },
      { type: 'operator', value: 'as' },
      { type: 'type', value: 'Decimal' }
    ];
    expect(expressionToFhirPath(expression)).toBe("%patient.age as Decimal");
  });

  it('should convert index tokens correctly', () => {
    const expression = [
      { type: 'variable', value: 'patient' },
      { type: 'field', value: 'name' },
      { type: 'index', value: '0' }
    ];
    expect(expressionToFhirPath(expression)).toBe("%patient.name[0]");
  });

  it('should handle nested field access with indices', () => {
    const expression = [
      { type: 'variable', value: 'patient' },
      { type: 'field', value: 'name' },
      { type: 'index', value: '0' },
      { type: 'field', value: 'given' },
      { type: 'index', value: '0' }
    ];
    expect(expressionToFhirPath(expression)).toBe("%patient.name[0].given[0]");
  });
}); 