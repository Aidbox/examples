import { Controller, Post, Body } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { NextQuestionRequest, NextQuestionResponse } from './types';

@Controller()
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  // Use the full path to handle the $ character properly
  @Post('fhir/Questionnaire/:operation')
  async nextQuestion(
    @Body() request: NextQuestionRequest,
  ): Promise<NextQuestionResponse> {
    return this.questionnaireService.getNextQuestion(request);
  }
}
