if(!customElements.get("questionnaire-custom-renderer")) {

class QuestionnaireCustomRenderer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._questionnaire = null;
    this._questionnaireResponse = null;
    this._onQuestionnaireResponseChange = null;
    this.root = null;
  }

  static get observedAttributes() {
    return ['questionnaire', 'questionnaire-response'];
  }

  connectedCallback() {
    try {
      this._questionnaire = JSON.parse(this.getAttribute('questionnaire'));
    } catch (e) {
       console.error('Error parsing attributes:', e);
       this._questionnaire = null;
    }

    try {
      this._questionnaireResponse = JSON.parse(this.getAttribute('questionnaire-response'));
    } catch (e) {
      console.error('Error parsing attributes:', e);
      this._questionnaireResponse = null;
    }

    if (this._onQuestionnaireResponseChange) {
      this._onQuestionnaireResponseChange = this.onQuestionnaireResponseChange.bind(this);
    }
    
    this.render();
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.shadowRoot) return;   
     if (oldValue === newValue) return;

    switch (name) {
      case 'questionnaire':
        try {
          this._questionnaire = newValue ? JSON.parse(newValue) : null;
        } catch (e) {
          console.error('Invalid questionnaire JSON:', e);
        }
        break;
      case 'questionnaire-response':
        try {
          this._questionnaireResponse = newValue ? JSON.parse(newValue) : null;

        } catch (e) {
          console.error('Invalid questionnaire response JSON:', e);
        }
        break;
    }

    this.render();
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
    this._onQuestionnaireResponseChange = callback;
  }


  render() {
    if (!this.shadowRoot) return;
    
    // Render Questionnaire Here
    
  }
}
 customElements.define('questionnaire-custom-renderer', QuestionnaireCustomRenderer);
}
