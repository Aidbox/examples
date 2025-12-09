import { Injectable } from '@nestjs/common';
import {
  NextQuestionRequest,
  NextQuestionResponse,
  QuestionnaireResponseItem,
  QuestionnaireItem,
  QuestionnaireResponse,
} from './types';
import { PHQ2_QUESTIONNAIRE } from './questionnaires/phq2';
import { PHQ9_QUESTIONNAIRE } from './questionnaires/phq9';

@Injectable()
export class QuestionnaireService {
  getNextQuestion(
    request: NextQuestionRequest,
  ): NextQuestionResponse {
    // Check if this is PHQ-2 response
    const questionnaireResponse = request.parameter[0].resource;

    console.log("Request: ", request);
    console.log("Questionnaire: ", questionnaireResponse.questionnaire);
    console.log("Questionnaire items: ", questionnaireResponse.item);

    if (questionnaireResponse.questionnaire?.includes('phq-2')) {
      const score = this.calculatePHQ2Score(questionnaireResponse);

      console.log(`PHQ-2 Score: ${score}`);

      if (score > 2) {
        // Add PHQ-9 questions to the existing questionnaire, preserving PHQ-2 answers
        console.log('Score > 2, adding PHQ-9 questions');

        return {
          resourceType: 'QuestionnaireResponse',
          questionnaire: '#' + PHQ9_QUESTIONNAIRE.id,
          status: 'in-progress',
          item: questionnaireResponse.item || [], // Preserve existing answers
          contained: [PHQ9_QUESTIONNAIRE],
        };
      } else {
        // Return completed QuestionnaireResponse (assessment complete)
        
        return {
          resourceType: 'QuestionnaireResponse',
          status: 'completed',
          item: questionnaireResponse.item || [], // Preserve existing answers
        };
      }
    } else if (questionnaireResponse.questionnaire?.includes('phq-9')) {
      // PHQ-9 response received, complete the assessment
      console.log('Received PHQ-  9 response, completing assessment');

      return {
        ...questionnaireResponse,
        status: 'completed' 
      };
    }


    // If not PHQ-2 response, return PHQ-2 questionnaire to start
    console.log('Starting with PHQ-2');
    return {
      resourceType: 'QuestionnaireResponse',
      questionnaire: '#' + PHQ2_QUESTIONNAIRE.id,
      status: 'in-progress',
      contained: [PHQ2_QUESTIONNAIRE],
    };
  }

  private isPHQ2Response(questionnaireResponse: QuestionnaireResponse): boolean {
    // Check if response contains PHQ-2 questions
    const items = questionnaireResponse.item || [];
    const phq2LinkIds = ['phq2-1', 'phq2-2'];

    return items.some(item => phq2LinkIds.includes(item.linkId));
  }

  private calculatePHQ2Score(
    questionnaireResponse: QuestionnaireResponse,
  ): number {
    const items = questionnaireResponse.item || [];
    let totalScore = 0;

    for (const item of items) {
      const score = this.getAnswerScore(item);
      totalScore += score;
    }

    return totalScore;
  }

  private getAnswerScore(item: QuestionnaireResponseItem): number {
    if (!item.answer || item.answer.length === 0) {
      return 0;
    }

    const answer = item.answer[0];

    // Check for integer value (direct score)
    if (answer.valueInteger !== undefined) {
      return answer.valueInteger;
    }

    // Check for coding value (extract score from extension or code)
    if (answer.valueCoding?.code) {
      // PHQ questions typically use codes like "LA6568-5" for "Not at all" = 0
      // We'll extract the score from the ordinal extension if available
      // For simplicity, mapping common LOINC answer codes to scores
      const codeToScore: { [key: string]: number } = {
        'LA6568-5': 0, // Not at all
        'LA6569-3': 1, // Several days
        'LA6570-1': 2, // More than half the days
        'LA6571-9': 3, // Nearly every day
      };

      return codeToScore[answer.valueCoding.code] || 0;
    }

    return 0;
  }
}
