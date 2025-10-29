import { Questionnaire } from '../types';

export const PHQ2_QUESTIONNAIRE: Questionnaire = {
  resourceType: 'Questionnaire',
  id: 'phq-2',
  url: 'http://example.org/Questionnaire/phq-2',
  version: '1.0.0',
  name: 'PHQ2',
  title: 'Patient Health Questionnaire-2',
  status: 'active',
  extension: [
    {
      url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-questionnaireAdaptive',
      valueUri: 'http://adaptive-forms-server:3000/',
    },
  ],
  item: [
    {
      linkId: 'phq2-1',
      text: 'Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?',
      type: 'choice',
      required: true,
      answerOption: [
        {
          valueCoding: {
            system: 'http://loinc.org',
            code: 'LA6568-5',
            display: 'Not at all',
          },
        },
        {
          valueCoding: {
            system: 'http://loinc.org',
            code: 'LA6569-3',
            display: 'Several days',
          },
        },
        {
          valueCoding: {
            system: 'http://loinc.org',
            code: 'LA6570-1',
            display: 'More than half the days',
          },
        },
        {
          valueCoding: {
            system: 'http://loinc.org',
            code: 'LA6571-9',
            display: 'Nearly every day',
          },
        },
      ],
    },
    {
      linkId: 'phq2-2',
      text: 'Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?',
      type: 'choice',
      required: true,
      answerOption: [
        {
          valueCoding: {
            system: 'http://loinc.org',
            code: 'LA6568-5',
            display: 'Not at all',
          },
        },
        {
          valueCoding: {
            system: 'http://loinc.org',
            code: 'LA6569-3',
            display: 'Several days',
          },
        },
        {
          valueCoding: {
            system: 'http://loinc.org',
            code: 'LA6570-1',
            display: 'More than half the days',
          },
        },
        {
          valueCoding: {
            system: 'http://loinc.org',
            code: 'LA6571-9',
            display: 'Nearly every day',
          },
        },
      ],
    },
  ],
};
