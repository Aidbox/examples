# aidbox-forms-renderer-react-controlled

In controlled mode, integrating the Aidbox Forms Renderer with React involves 
passing the questionnaire and optionally questionnaireResponse as attributes to 
the Forms Renderer component. Changes made within the form are captured using 
event listeners in useEffect. In this configuration, the resources are neither 
loaded from nor saved to Aidbox, allowing for full management of the resources 
within the React application. This approach is beneficial for applications 
requiring custom resource handling and management.

[Online demo](https://aidbox.github.io/examples/aidbox-forms-renderer-react-controlled/)

## Example

```js
import React, { useState, useEffect, useRef } from 'react';

const AidboxFormRenderer = ({ questionnaire }) => {
  const formRef = useRef(null);

  useEffect(() => {
    const handleFormChange = (event) => {
      const updatedResponse = event.detail;
      console.log('Questionnaire response updated:', updatedResponse);
    };

    const handleFormReady = (event) => {
      console.log('Aidbox Form Renderer is ready:', event);
    };

    const formElement = formRef.current;

    if (formElement) {
      formElement.addEventListener('change', handleFormChange);
      formElement.addEventListener('ready', handleFormReady);
    }

    // Cleanup event listeners when component unmounts
    return () => {
      if (formElement) {
        formElement.removeEventListener('change', handleFormChange);
        formElement.removeEventListener('ready', handleFormReady);
      }
    };
  }, []);

  return (
    <aidbox-form-renderer
      ref={formRef}
      style={{ width: '100%', border: 'none', alignSelf: 'stretch', display: 'flex' }}
      questionnaire={JSON.stringify(questionnaire)}
    />
  );
};
```

## Available attributes
* `base-url` - optional, base url of your Aidbox instance, default is the url of Aidbox instance the script is loaded from
* `style` - optional, style of the underlying iframe
* `token` - optional, JWT token to authenticate the user
* `questionnaire` - required, questionnaire as a JSON string
* `questionnaire-response` - optional, questionnaire response as a JSON string

## Events
* `change` - emitted when the questionnaire response is modified, triggered on auto-save or when submit button is clicked. `event.detail` contains the modified questionnaire response as JSON object.
* `ready` - emitted when Aidbox Forms Renderer is loaded and ready to be used.
