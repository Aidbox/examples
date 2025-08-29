import React from 'react';
import ReactDOM from 'react-dom/client';
import { BaseRenderer, useBuildForm, rendererThemeComponentOverrides, rendererThemeOptions, useQuestionnaireResponseStore } from '@aehrc/smart-forms-renderer';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

if(!customElements.get("aidbox-form-csiro-renderer")) {

class SmartFormsRenderer extends HTMLElement {
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

    this.render();
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log("Attribute changed:", name, oldValue, newValue);
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
    console.log("set on questionnaire response change callback");
    this._onQuestionnaireResponseChange = callback;
  }

  

  render() {
    if (!this.shadowRoot) return;
    console.log("Render this shit: ", this._questionnair);
    const container = this.shadowRoot.querySelector('#react-root') || document.createElement('div');
    container.id = 'react-root';
    container.style.fontFamily = 'Roboto, sans-serif';

    const portal = document.createElement('div');
    portal.id = 'portal';
    this.shadowRoot.appendChild(portal);

    if (!this.shadowRoot.contains(container)) {

      this.shadowRoot.appendChild(container);
    }

    if (!this.root) {
      this.root = ReactDOM.createRoot(container);
    }
    console.log("this questionnaire response: ", this._questionnaireResponse);
    
      const handleQuestionnaireResponseChange = (response) => {
          console.log("QuestionnaireResponseChange: ", response);
      if (this._onQuestionnaireResponseChange) {
        this._onQuestionnaireResponseChange(response);
      }

      this.dispatchEvent(new CustomEvent('questionnaire-response-change', {
        detail: { response },
        bubbles: true
      }));
    };

    const cache = createCache({
        key: "css",
        prepend: true,
        container: container,
    });


      const theme =
            createTheme(rendererThemeOptions);
      theme.components = rendererThemeComponentOverrides(theme);

      theme.components = {
        ...theme.components,
        MuiPopover: {
          defaultProps: {
            container: portal
          }
        },
        MuiPopper: {
          defaultProps: {
            container: portal
          }
        },
        MuiModal: {
          defaultProps: {
            container: portal
          }
        },
        MuiDialog: {
          defaultProps: {
            container: portal
          }
        }
      };

    const ShadowThemeProvider = ({ children }) => {
        return React.createElement(CacheProvider, {value: cache},
            React.createElement(
                ThemeProvider,
                { theme },
                children
            ),
      );
    };



    

    const RendererWrapper = () => {
      const updatableResponse = useQuestionnaireResponseStore.use.updatableResponse();

      handleQuestionnaireResponseChange(updatableResponse);
      const { isLoading, rendererProps } = useBuildForm(
        this._questionnaire,
        this._questionnaireResponse || null,
        
        
      );

      

      if (isLoading) {
        return React.createElement('div', null, 'Loading...');
      }

      return React.createElement(BaseRenderer, rendererProps);
    };

      this.root.render(
      React.createElement(ShadowThemeProvider, null,
        React.createElement(RendererWrapper)
      )
    );
  }
}
 customElements.define('aidbox-form-csiro-renderer', SmartFormsRenderer);
}
