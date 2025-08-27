# aidbox-forms-builder-angular-controlled

In controlled mode, integrating the Aidbox Forms Builder with Angular.js
involves passing the editing questionnaire as an attribute to the Forms
Builder component. Changes made within the form are emitted to the parent
component through events. In this configuration, questionnaires are neither
loaded from nor saved to Aidbox, allowing for full management of the 
questionnaire within the Angular.js application. This approach is 
beneficial for applications requiring custom questionnaire handling and
management.

[Demo](https://aidbox.github.io/examples/aidbox-forms-builder-angular-controlled/)

## Example

```js
<aidbox-form-builder
  style="width: 100%; border: none; align-self: stretch; display: flex"
  value="{{ questionnaire-json-as-string }}"
  ng-on-change="handleFormChange($event)"
  ng-on-ready="handleFormReady($event)"
  show-share
  hide-back
  hide-save
  hide-publish
>
</aidbox-form-builder>
```

## Available attributes
Please refer to [Aidbox Forms documentation](https://docs.aidbox.app/modules/aidbox-forms/aidbox-ui-builder-alpha/embedding-builder) for more information about available attributes.
