import { Questionnaire } from '../types';

export const PHQ9_QUESTIONNAIRE: Questionnaire = {
  resourceType: 'Questionnaire',
  id: 'phq-9',
  url: 'http://example.org/Questionnaire/phq-9',
  version: '1.0.0',
  name: 'PHQ9',
  title: 'Patient Health Questionnaire-9',
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
    {
      linkId: 'phq9-3',
      text: 'Over the last 2 weeks, how often have you been bothered by trouble falling or staying asleep, or sleeping too much?',
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
      linkId: 'phq9-4',
      text: 'Over the last 2 weeks, how often have you been bothered by feeling tired or having little energy?',
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
      linkId: 'phq9-5',
      text: 'Over the last 2 weeks, how often have you been bothered by poor appetite or overeating?',
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
      linkId: 'phq9-6',
      text: 'Over the last 2 weeks, how often have you been bothered by feeling bad about yourself - or that you are a failure or have let yourself or your family down?',
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
      linkId: 'phq9-7',
      text: 'Over the last 2 weeks, how often have you been bothered by trouble concentrating on things, such as reading the newspaper or watching television?',
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
      linkId: 'phq9-8',
      text: 'Over the last 2 weeks, how often have you been bothered by moving or speaking so slowly that other people could have noticed? Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual?',
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
      linkId: 'phq9-9',
      text: 'Over the last 2 weeks, how often have you been bothered by thoughts that you would be better off dead, or of hurting yourself in some way?',
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
