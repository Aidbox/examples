# Integrating external attachment preview tool

Example of integration Aidbox Forms Renderer with React.js

[Demo](https://aidbox.github.io/examples/aidbox-forms-external-attachment-viewer/)

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
Please refer to [Aidbox Forms documentation](https://docs.aidbox.app/modules/aidbox-forms/aidbox-ui-builder-alpha/embedding-renderer) for more information about available attributes.
