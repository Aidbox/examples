# aidbox-forms-renderer-react

Example of integration Aidbox Forms Renderer with React.js

[Demo](https://aidbox.github.io/examples/aidbox-forms-renderer-react/)

## Example

```js
import React from 'react';

const AidboxFormRenderer = ({ id }) => {
  return (
    <aidbox-form-renderer
      style={{ width: '100%', border: 'none', alignSelf: 'stretch', display: 'flex' }}
      questionnaire-id={id}
    ></aidbox-form-renderer>
  );
};

export default AidboxFormRenderer;
```

## Available attributes
* `base-url` - optional, base url of your Aidbox instance, default is the url of Aidbox instance the script is loaded from
* `style` - optional, style of the underlying iframe
* `token` - optional, JWT token to authenticate the user
* `questionnaire-id` - optional, id of the questionnaire to load, either `questionnaire` or `questionnaire-id` should be provided
* `questionnaire-response-id` - optional, id of the questionnaire response to load, either `questionnaire-response` or `questionnaire-response-id` should be provided
