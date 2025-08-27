if(!customElements.get("simple-questionnaire-renderer")) {

class SimpleQuestionnaireRenderer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._questionnaire = null;
    this._questionnaireResponse = null;
  }

  static get observedAttributes() {
    return ['questionnaire', 'questionnaire-response'];
  }

  connectedCallback() {
    try {
      this._questionnaire = JSON.parse(this.getAttribute('questionnaire'));
    } catch (e) {
      console.error('Error parsing questionnaire:', e);
      this._questionnaire = null;
    }
    try {
      const responseAttr = this.getAttribute('questionnaire-response');
      this._questionnaireResponse = responseAttr ? JSON.parse(responseAttr) : null;
    } catch (e) {
      console.error('Error parsing questionnaire response:', e);
      this._questionnaireResponse = null;
    }

    if(this.onQuestionnaireResponseChange) {
      this._onQuestionnaireResponseChange = this.onQuestionnaireResponseChange.bind(this);
    }
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.shadowRoot) return;
    if (oldValue === newValue) return;
    if (name === 'questionnaire') {
      try {
        this._questionnaire = newValue ? JSON.parse(newValue) : null;
      } catch (e) {
        console.error('Invalid questionnaire JSON:', e);
      }
      this.render();
    }
    if (name === 'questionnaire-response') {
      try {
        this._questionnaireResponse = newValue ? JSON.parse(newValue) : null;
      } catch (e) {
        console.error('Invalid questionnaire response JSON:', e);
      }
      this.render();
    }
  }

  get questionnaire() {
    return this._questionnaire;
  }

  set questionnaire(value) {
    this._questionnaire = value;
    this.render();
  }

  get questionnaireResponse() {
    return this._questionnaireResponse;
  }

  set questionnaireResponse(value) {
    this._questionnaireResponse = value;
    this.render();
  }

  set onQuestionnaireResponseChange(callback) {
    console.log("set on questionnaire response change callback");
    this._onQuestionnaireResponseChange = callback;
  }

  render() {
    if (!this.shadowRoot) return;
    
    this.shadowRoot.innerHTML = '';
    if (!this._questionnaire || !this._questionnaire.item) {
      this.shadowRoot.innerHTML = '<p>No questionnaire data provided.</p>';
      return;
    }
    const form = document.createElement('form');
    this._questionnaire.item.forEach(item => {
      const label = document.createElement('label');
      label.textContent = item.text || item.linkId;
      label.htmlFor = item.linkId;
      form.appendChild(label);
      let input;
      switch (item.type) {
        case 'string':
          input = document.createElement('input');
          input.type = 'text';
          break;
        case 'boolean':
          input = document.createElement('input');
          input.type = 'checkbox';
          break;
        case 'integer':
          input = document.createElement('input');
          input.type = 'number';
          break;
        default:
          input = document.createElement('input');
          input.type = 'text';
      }
      input.id = item.linkId;
      input.name = item.linkId;

      const existingAnswer = this.getAnswerForLinkId(item.linkId);
      if (existingAnswer) {
        if (item.type === 'boolean') {
          input.checked = existingAnswer.valueBoolean || false;
        } else if (item.type === 'integer') {
          input.value = existingAnswer.valueInteger || '';
        } else {
          input.value = existingAnswer.valueString || '';
        }
      }

      input.addEventListener('input', () => this.updateQuestionnaireResponse());
      input.addEventListener('change', () => this.updateQuestionnaireResponse());

      form.appendChild(input);
      form.appendChild(document.createElement('br'));
    });
    this.shadowRoot.appendChild(form);
  }

  getAnswerForLinkId(linkId) {
    if (!this._questionnaireResponse || !this._questionnaireResponse.item) {
      return null;
    }
    const responseItem = this._questionnaireResponse.item.find(item => item.linkId === linkId);
    return responseItem && responseItem.answer && responseItem.answer[0] ? responseItem.answer[0] : null;
  }

  handleQuestionnaireResponseChange = (response) => {
    
      if (this._onQuestionnaireResponseChange) {
         this._onQuestionnaireResponseChange(response);
      }

      this.dispatchEvent(new CustomEvent('questionnaire-response-change', {
        detail: { response },
        bubbles: true
      }));
    }

  updateQuestionnaireResponse() {
    if (!this._questionnaire || !this.shadowRoot) return;

    if (!this._questionnaireResponse) {
      this._questionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        questionnaire: this._questionnaire.id || this._questionnaire.url,
        status: 'in-progress',
        item: []
      };
    }

    const form = this.shadowRoot.querySelector('form');
    if (!form) return;

    this._questionnaireResponse.item = [];

    this._questionnaire.item.forEach(qItem => {
      const input = form.querySelector(`#${qItem.linkId}`);
      if (!input) return;

      let answer = null;
      if (qItem.type === 'boolean') {
        if (input.checked !== undefined) {
          answer = { valueBoolean: input.checked };
        }
      } else if (qItem.type === 'integer') {
        if (input.value && input.value.trim() !== '') {
          answer = { valueInteger: parseInt(input.value, 10) };
        }
      } else {
        if (input.value && input.value.trim() !== '') {
          answer = { valueString: input.value };
        }
      }

      if (answer) {
        this._questionnaireResponse.item.push({
          linkId: qItem.linkId,
          answer: [answer]
        });
      }
    });

    this.handleQuestionnaireResponseChange(this._questionnaireResponse);
  }

  getQuestionnaireResponse() {
    this.updateQuestionnaireResponse();
    return this._questionnaireResponse;
  }
}
customElements.define('simple-questionnaire-renderer', SimpleQuestionnaireRenderer);
}
